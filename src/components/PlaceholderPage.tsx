type PlaceholderPageProps = {
  title: string
  message?: string
}

export function PlaceholderPage({
  title,
  message = "Content coming soon...",
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="text-gray-400">{message}</p>
    </div>
  )
}
