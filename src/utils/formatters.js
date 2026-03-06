export const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export const toInputDate = (value) => {
  if (!value) return ''
  return new Date(value).toISOString().split('T')[0]
}

export const getTodayInputDate = () => new Date().toISOString().split('T')[0]
