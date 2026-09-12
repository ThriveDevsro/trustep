import { redirect } from 'next/navigation'

export default function LinkCheckPage() {
  redirect('/submit?tab=url')
}
