export function FormError({ error }: { error?: string | null }) {
  if (!error) return null
  return (
    <div className="alert error" role="alert">
      {error}
    </div>
  )
}
