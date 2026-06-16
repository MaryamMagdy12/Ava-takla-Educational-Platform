<?php

/**
 * Public catalog for the Specialized Courses front-end (until DB-backed special_programs exist).
 */
return [
    'programs' => [
        [
            'slug' => 'liturgy-specialist',
            'title' => 'مسار الخدمة الليتورجية المتقدّمة',
            'tagline' => 'للخادمين الذين يتعمّقون في طقوس القداس والقراءات.',
            'summary' => 'وحدات نظرية مع ورش عمل قصيرة حول الترتيب والرمزية في القداس الإلهي.',
            'unit_count' => 5,
            'exams' => [
                ['id' => 'sc-e1', 'title' => 'امتحان الوحدة الأولى — مفاهيم أساسية', 'duration_minutes' => 45, 'type' => 'اختيار من متعدد'],
                ['id' => 'sc-e2', 'title' => 'امتحان منتصف المسار — تطبيقات', 'duration_minutes' => 60, 'type' => 'مقالي قصير'],
                ['id' => 'sc-e3', 'title' => 'الاختبار الختامي', 'duration_minutes' => 90, 'type' => 'شامل'],
            ],
        ],
        [
            'slug' => 'catechesis-youth',
            'title' => 'التعليم المسيحي للشباب',
            'tagline' => 'إعداد دروس وجلسات نقاش لمرحلة المراهقة.',
            'summary' => 'أدوات تفاعلية، قصص، وتمارين جماعية قابلة للتكييف مع فصلك.',
            'unit_count' => 6,
            'exams' => [
                ['id' => 'sc-e4', 'title' => 'اختبار أساليب الشرح', 'duration_minutes' => 40, 'type' => 'عملي'],
                ['id' => 'sc-e5', 'title' => 'تقييم خطة درس أسبوعي', 'duration_minutes' => 30, 'type' => 'تسليم ملف'],
            ],
        ],
        [
            'slug' => 'music-orthodox',
            'title' => 'اللحن والإيقاع في التقليد القبطي',
            'tagline' => 'مبادئ التوزيع الصوتي والانضباط مع الجوقة.',
            'summary' => 'تمارين سمعية وبصرية مع جدول تدريب على مدار المسار.',
            'unit_count' => 4,
            'exams' => [
                ['id' => 'sc-e6', 'title' => 'امتحان سمعي — تمييز الألحان', 'duration_minutes' => 35, 'type' => 'استماع'],
                ['id' => 'sc-e7', 'title' => 'امتحان نظري — المصطلحات', 'duration_minutes' => 25, 'type' => 'اختيار من متعدد'],
                ['id' => 'sc-e8', 'title' => 'عرض جوقة قصير (تسجيل)', 'duration_minutes' => 15, 'type' => 'تسليم فيديو'],
            ],
        ],
    ],
];
