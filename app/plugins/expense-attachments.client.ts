export default defineNuxtPlugin(() => {
    const expenseStore = useExpenseStore()

    void expenseStore.hydrateTicketAttachments().catch((error) => {
        console.error('Error hydrating expense attachments', error)
    })
})
