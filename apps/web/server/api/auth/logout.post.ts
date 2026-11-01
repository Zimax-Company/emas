export default defineEventHandler((event) => {
  clearSessionToken(event)
  return { data: null }
})
