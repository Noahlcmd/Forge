import { SignupForm } from '@/components/auth/SignupForm'

interface Props {
  searchParams: { next?: string }
}

export default function SignupPage({ searchParams }: Props) {
  return <SignupForm next={searchParams.next} />
}
