export const insertCommas = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export const formatYen = (num: number): string => {
  return `¥${insertCommas(num)}`
}

export const extractNumber = (str: string): number => {
  const numericString = str.replace(/[^0-9.-]+/g, "")
  return parseFloat(numericString)
}
