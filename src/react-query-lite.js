import React from 'react'

const context = React.createContext()

export function QueryClientProvider({ children, client }) {
    React.useEffect(() => {
        const onFocus = () => {
            client.queries.forEach(query => {
                query.subscribers.forEach(subscriber => {
                    subscriber.fetch()
                })
            })
        }

        window.addEventListener('visibilitychange', onFocus, false)
        window.addEventListener('focus', onFocus)
        return () => {
            window.removeEventListener('visibilitychange', onFocus)
            window.removeEventListener('focus', onFocus)
        }
    }, [client])

    return <context.Provider value={client}>{children}</context.Provider>
}

export class QueryClient {
    constructor() {
        this.queries = []
        this.subscribers = []
    }
    getQuery = options => {
        const queryHash = JSON.stringify(options.queryKey)
        let query = this.queries.find(d => d?.queryHash === queryHash)

        if (!query) {
            query = createQuery(this, options)
            this.queries.push(query)
        }

        return query
    }

    subscribe = callback => {
        this.subscribers.push(callback)
        return () => {
            this.subscribers = this.subscribers.filter(d => d != callback)
        }
    }

    notify = () => {
        this.subscribers.forEach(cb => cb())
    }

}

export function useQuery({ queryKey, queryFn, staleTime, cacheTime }) {
    
    const client = React.useContext(context)
    const [, rerender] = React.useReducer(i => i + 1, 0)

    const observerRef = React.useRef()
    if (!observerRef.current) {
        observerRef.current = createQueryObserver(client, {
            queryKey,
            queryFn,
            staleTime,
            cacheTime
        })
    }
  
    React.useEffect(() => {
        // 把observer加入到query的subscribe列表中。进入的时候会去看是否需要执行fetch获取数据
        // 卸载的时候 把query的subscribe列表这个observer删除掉。并开启一个删除这个query的定时器任务 cacheTime
        return observerRef.current.subscribe(rerender)
    }, [])

    return observerRef.current.getResult()

}

function createQuery(client, { queryKey, queryFn, cacheTime = 5 * 60 * 1000 }) {
    let query = {
        queryKey,
        queryFn,
        queryHash: JSON.stringify(queryKey),
        promise: null,
        subscribers: [],
        gcTimeout: null,
        state: {
            status: 'loading',
            isFetching: true,
            data: undefined,
            error: undefined
        },
        subscribe: subscriber => {
            query.subscribers.push(subscriber)
            query.unscheduleGC() // 删除之前的清除定时器任务
            return () => { // 使用useQuery的那个组件卸载的时候会去执行
                query.subscribers = query.subscribers.filter(d => d !== subscriber)
                if (!query.subscribers.length) {
                    query.scheduleGC()
                }
            }
        },
        /**
         * 倒计时 删除某一个query ，也就是cacheTime的实际意义。
         */
        scheduleGC: () => {
            query.gcTimeout = setTimeout(() => {
                client.queries = client.queries.filter(d => d !== query)
            }, cacheTime);
        },
        unscheduleGC: () => {
            clearTimeout(query.gcTimeout)
        },

        setState: updater => {
            query.state = updater(query.state) // 更新数据
            query.subscribers.forEach(subscriber => subscriber.notify()) // 重新渲染useQuery这个hooks 
        },
        fetch: () => {
            if (!query.promise) {
                query.promise = (async () => {
                    query.setState(old => ({
                        ...old,
                        isFetching: true,
                        error: undefined
                    }))

                    try {
                        const data = await queryFn()
                        query.setState(old => ({
                            ...old,
                            status: 'success',
                            lastUpdated: Date.now(),
                            data
                        }))
                    } catch (error) {
                        query.setState(old => ({
                            ...old,
                            status: 'error',
                            error,
                        }))
                    } finally {
                        query.promise = null
                        query.setState(old => ({
                            ...old,
                            isFetching: false
                        }))
                    }
                })()
            }
            return query.promise
        }
    }
    return query

}

function createQueryObserver(client, { queryKey, queryFn, staleTime = 0, cacheTime }) {
    const query = client.getQuery({ queryKey, queryFn, cacheTime })

    const observer = {
        notify: () => { },
        getResult: () => query.state,
        subscribe: callback => {
           
            observer.notify = callback
            const unsubscribe = query.subscribe(observer)

            observer.fetch()
            return unsubscribe
        },
        fetch: () => {
            if (
                !query.state.lastUpdated ||
                Date.now() - query.state.lastUpdated > staleTime
            ) {
                query.fetch()
            }
        }
    }

    return observer

}