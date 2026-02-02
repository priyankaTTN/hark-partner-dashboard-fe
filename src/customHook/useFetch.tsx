import { useState, useEffect } from "react"

const useFetch = (url: string) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Reset loading and error states when URL changes
    setLoading(true)
    setError(null)
    
    // Abort controller for cleanup
    const abortController = new AbortController()
    
    fetch(url, { signal: abortController.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        setData(data)
        setError(null)
      })
      .catch((error) => {
        // Don't set error if request was aborted
        if (error.name !== 'AbortError') {
          setError(error)
        }
      })
      .finally(() => {
        setLoading(false)
      })
    
    // Cleanup function to abort fetch if component unmounts or URL changes
    return () => {
      abortController.abort()
    }
  }, [url])

  return { data, loading, error }
}

export default useFetch