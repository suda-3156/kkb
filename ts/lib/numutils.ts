export const insertCommas = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export const formatYen = (num: number): string => {
  return `¥${insertCommas(num)}`
}
