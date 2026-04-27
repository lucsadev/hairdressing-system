import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const ARGENTINA_OFFSET_HOURS = 3

export function toArgentinaDate(date: Date | string): dayjs.Dayjs {
  const utcMoment = dayjs.utc(date)
  return utcMoment.subtract(ARGENTINA_OFFSET_HOURS, 'hour')
}

export function toUTCDate(localDate: Date): dayjs.Dayjs {
  return dayjs(localDate).add(ARGENTINA_OFFSET_HOURS, 'hour')
}

export function getDayRangeUTC(date: Date): { start: Date; end: Date } {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  
  // Use day range from midnight (local) to midnight next day (local) in UTC
  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0))
  
  return { start, end }
}

export function formatLocalDate(date: Date | string): string {
  const d = dayjs(date)
  const year = d.year()
  const month = String(d.month() + 1).padStart(2, '0')
  const day = String(d.date()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatLocalTime(date: Date | string): string {
  const d = dayjs(date)
  return `${String(d.hour()).padStart(2, '0')}:${String(d.minute()).padStart(2, '0')}`
}

export function formatFullLocalDate(date: Date | string): string {
  const d = toArgentinaDate(date)
  const dayName = d.format('dddd')
  const dayNumber = d.format('DD')
  const monthName = d.format('MMMM')
  const year = d.format('YYYY')
  const dayNameCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1)
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1)
  return `${dayNameCapitalized}, ${dayNumber} de ${monthNameCapitalized} de ${year}`
}

// Solo día y mes: "24 de Abril"
export function formatShortLocalDate(date: Date | string): string {
  const d = toArgentinaDate(date)
  const dayNumber = d.format('DD')
  const monthName = d.format('MMMM')
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1)
  return `${dayNumber} de ${monthNameCapitalized}`
}

export function parseLocalTime(localDay: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const result = new Date(localDay)
  result.setHours(hours, minutes, 0, 0)
  return result
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d
}