export interface ExpenseAttachment {
    id: string
    dataUrl: string
    name?: string
    type?: string
    size?: number
}

const DB_NAME = 'dietator'
const DB_VERSION = 1
const STORE_NAME = 'expenseAttachments'

const isIndexedDbAvailable = () => typeof indexedDB !== 'undefined'

const dataUrlByteSize = (dataUrl: string): number => {
    const commaIndex = dataUrl.indexOf(',')
    const base64 = commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1)
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

export const getAttachmentSize = (attachment: Pick<ExpenseAttachment, 'dataUrl' | 'size'>) =>
    attachment.size ?? dataUrlByteSize(attachment.dataUrl)

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
    new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
    })

let dbPromise: Promise<IDBDatabase> | null = null

const openDb = (): Promise<IDBDatabase> => {
    if (!isIndexedDbAvailable()) {
        return Promise.reject(new Error('IndexedDB is not available'))
    }

    dbPromise ??= new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'))
    })

    return dbPromise
}

const runTransaction = async <T>(
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
    const db = await openDb()
    const transaction = db.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    return requestToPromise(callback(store))
}

export const buildExpenseAttachmentId = (expenseId: string) => `expense:${expenseId}`

export const saveExpenseAttachment = async (attachment: ExpenseAttachment): Promise<ExpenseAttachment> => {
    const storedAttachment = {
        ...attachment,
        size: getAttachmentSize(attachment)
    }
    await runTransaction('readwrite', store => store.put(storedAttachment))
    return storedAttachment
}

export const getExpenseAttachment = async (id: string): Promise<ExpenseAttachment | null> => {
    const result = await runTransaction('readonly', store => store.get(id))
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
    await runTransaction('readwrite', store => store.delete(id))
}

export const deleteExpenseAttachments = async (ids: string[]): Promise<void> => {
    await Promise.all(ids.map(id => deleteExpenseAttachment(id)))
}
