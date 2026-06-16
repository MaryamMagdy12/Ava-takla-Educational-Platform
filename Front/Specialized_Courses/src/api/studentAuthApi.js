import { apiClient } from './apiClient.js'

export async function postStudentLogin(student_unique_id, password) {
  const { data } = await apiClient.post('/auth/student/login', {
    student_unique_id: student_unique_id.trim(),
    password,
  })
  if (!data?.data?.token) throw new Error('Invalid login response.')
  return data.data
}
