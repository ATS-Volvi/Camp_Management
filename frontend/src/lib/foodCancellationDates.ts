export function foodCancellationDateAllowed(date: string, arrival: string, departure?: string | null) {
  return Boolean(date && arrival && date >= arrival && (!departure || date <= departure));
}