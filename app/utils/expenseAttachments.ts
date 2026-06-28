import { APP_STORE_NAMES, runObjectStoreTransaction } from '~/utils/appDatabase'

export interface ExpenseAttachment {
    id: string
    dataUrl: string
    name?: string
    type?: string
    size?: number
}

const STORE_NAME = APP_STORE_NAMES.expenseAttachments

const dataUrlByteSize = (dataUrl: string): number => {
    const commaIndex = dataUrl.indexOf(',')
    const base64 = commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1)
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

export const getAttachmentSize = (attachment: Pick<ExpenseAttachment, 'dataUrl' | 'size'>) =>
    attachment.size ?? dataUrlByteSize(attachment.dataUrl)

export const buildExpenseAttachmentId = (expenseId: string) => `expense:${expenseId}`

export const saveExpenseAttachment = async (attachment: ExpenseAttachment): Promise<ExpenseAttachment> => {
    const storedAttachment = {
        ...attachment,
        size: getAttachmentSize(attachment)
    }
    await runObjectStoreTransaction(STORE_NAME, 'readwrite', store => store.put(storedAttachment))
    return storedAttachment
}

export const getExpenseAttachment = async (id: string): Promise<ExpenseAttachment | null> => {
    const result = await runObjectStoreTransaction(STORE_NAME, 'readonly', store => store.get(id))
    return (result as ExpenseAttachment | undefined) ?? null
}

export const getExpenseAttachmentsStats = async (ids: string[]): Promise<{ count: number, bytes: number }> => {
    const uniqueIds = [...new Set(ids)]
    const attachments = await Promise.all(uniqueIds.map(id => getExpenseAttachment(id)))

    return attachments.reduce((stats, attachment) => {
        if (!attachment) return stats
        stats.count += 1
        stats.bytes += getAttachmentSize(attachment)
        return stats
    }, { count: 0, bytes: 0 })
}

export const deleteExpenseAttachment = async (id: string): Promise<void> => {
    await runObjectStoreTransaction(STORE_NAME, 'readwrite', store => store.delete(id))
}

export const deleteExpenseAttachments = async (ids: string[]): Promise<void> => {
    await Promise.all(ids.map(id => deleteExpenseAttachment(id)))
}
