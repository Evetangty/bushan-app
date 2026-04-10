import { useState } from 'react'

const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    const reader = new FileReader()

    reader.onload = () => {
      image.src = String(reader.result || '')
    }
    reader.onerror = () => reject(new Error('图片读取失败'))
    image.onerror = () => reject(new Error('图片解析失败'))
    image.onload = () => {
      const maxWidth = 800
      const ratio = Math.min(1, maxWidth / image.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(image.width * ratio)
      canvas.height = Math.floor(image.height * ratio)

      const context = canvas.getContext('2d')
      if (!context) return reject(new Error('无法处理图片'))

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }

    reader.readAsDataURL(file)
  })

export function useImageUpload() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      return await compressImage(file)
    } catch (err) {
      const message = err instanceof Error ? err.message : '图片处理失败'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { upload, loading, error }
}
