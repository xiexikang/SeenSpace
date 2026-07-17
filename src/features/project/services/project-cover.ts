const MAX_SOURCE_FILE_SIZE = 12 * 1024 * 1024
const COVER_WIDTH = 1280
const COVER_HEIGHT = 720
const COVER_QUALITY = 0.82
const MAX_DATA_URL_LENGTH = 2_400_000

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('无法读取这张图片'))
    }
    image.src = objectUrl
  })
}

export async function createProjectCoverDataUrl(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
  if (file.size > MAX_SOURCE_FILE_SIZE) {
    throw new Error('图片不能超过 12MB')
  }

  const image = await loadImage(file)
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('图片尺寸无效')
  }
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法处理图片')

  canvas.width = COVER_WIDTH
  canvas.height = COVER_HEIGHT
  context.fillStyle = '#f3f4f6'
  context.fillRect(0, 0, COVER_WIDTH, COVER_HEIGHT)

  const sourceRatio = image.naturalWidth / image.naturalHeight
  const targetRatio = COVER_WIDTH / COVER_HEIGHT
  let sourceX = 0
  let sourceY = 0
  let sourceWidth = image.naturalWidth
  let sourceHeight = image.naturalHeight

  if (sourceRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio
    sourceX = (image.naturalWidth - sourceWidth) / 2
  } else {
    sourceHeight = image.naturalWidth / targetRatio
    sourceY = (image.naturalHeight - sourceHeight) / 2
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    COVER_WIDTH,
    COVER_HEIGHT,
  )

  let quality = COVER_QUALITY
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.5) {
    quality -= 0.08
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('图片内容过于复杂，请更换一张图片')
  }

  return dataUrl
}
