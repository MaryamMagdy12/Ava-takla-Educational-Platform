<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\ODS\Reader as OdsReader;
use OpenSpout\Reader\ReaderInterface;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;

class SpreadsheetReaderService
{
    /**
     * Yield associative rows from the first sheet only (header row = keys).
     *
     * @return \Generator<int, array<string, string|null>>
     */
    public function rowsAssociativeFromFirstSheet(UploadedFile $file): \Generator
    {
        $path = $file->getRealPath();
        if ($path === false) {
            throw new \InvalidArgumentException('Invalid upload.');
        }

        $reader = $this->createReaderForUpload($file);
        $reader->open($path);

        try {
            foreach ($reader->getSheetIterator() as $sheet) {
                $header = null;
                foreach ($sheet->getRowIterator() as $row) {
                    $values = $this->rowToStrings($row);
                    if ($header === null) {
                        $header = array_map(static fn ($h) => strtolower(trim((string) $h)), $values);
                        continue;
                    }
                    if ($this->isEmptyRow($values)) {
                        continue;
                    }
                    $assoc = [];
                    foreach ($header as $i => $key) {
                        if ($key === '') {
                            continue;
                        }
                        $assoc[$key] = $values[$i] ?? null;
                    }
                    yield $assoc;
                }
                break;
            }
        } finally {
            $reader->close();
        }
    }

    private function createReaderForUpload(UploadedFile $file): ReaderInterface
    {
        $extension = strtolower($file->getClientOriginalExtension());

        return match ($extension) {
            'csv', 'txt' => new CsvReader(),
            'xlsx' => new XlsxReader(),
            'ods' => new OdsReader(),
            default => throw new \InvalidArgumentException("Unsupported spreadsheet type: {$extension}"),
        };
    }

    /**
     * @return list<string|null>
     */
    private function rowToStrings(Row $row): array
    {
        $out = [];
        foreach ($row->getCells() as $cell) {
            $out[] = $this->cellToString($cell);
        }

        return $out;
    }

    private function cellToString(Cell $cell): ?string
    {
        $v = $cell->getValue();
        if ($v === null) {
            return null;
        }
        if ($v instanceof \DateTimeInterface) {
            return $v->format('Y-m-d H:i:s');
        }
        if ($v instanceof \DateInterval) {
            return (string) $v->format('%R%a days');
        }

        return is_string($v) ? $v : (string) $v;
    }

    /**
     * @param  list<string|null>  $values
     */
    private function isEmptyRow(array $values): bool
    {
        foreach ($values as $v) {
            if ($v !== null && trim((string) $v) !== '') {
                return false;
            }
        }

        return true;
    }
}
