import type { Config } from '../../payload/payload-types'
import { PAGE } from '../_graphql/pages'
import { POST } from '../_graphql/posts'
import { PROJECT } from '../_graphql/projects'

const queryMap = {
  pages: {
    query: PAGE,
    key: 'Pages',
  },
  projects: {
    query: PROJECT,
    key: 'Projects',
  },
  posts: {
    query: POST,
    key: 'Posts',
  },
}

export const fetchDoc = async <T>(args: {
  collection: keyof Config['collections']
  slug?: string
  id?: string
  token?: string
}): Promise<T> => {
  const { collection, slug, token } = args || {}

  if (!queryMap[collection]) throw new Error(`Collection ${collection} not found`)

  const doc: T = await fetch(`${process.env.PAYLOAD_PUBLIC_SERVER_URL}/api/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    },
    body: JSON.stringify({
      query: queryMap[collection].query,
      variables: {
        slug,
      },
    }),
  })
    ?.then(res => res.json())
    ?.then(res => {
      if (res.errors) throw new Error(res?.errors?.[0]?.message ?? 'Error fetching doc')
      return res?.data?.[queryMap[collection].key]?.docs?.[0]
    })

  return doc
}
