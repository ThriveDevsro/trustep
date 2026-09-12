import { redirect } from 'next/navigation'

export default function SmsPage() {
  redirect('/submit?tab=sms')
}
