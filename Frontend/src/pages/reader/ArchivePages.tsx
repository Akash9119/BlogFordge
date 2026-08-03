import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi, tagsApi } from '@/api/taxonomy'
import { usersApi } from '@/api/users'
import { useAuth } from '@/context/auth-context'
import { isAdmin } from '@/lib/permissions'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/States'
import { PostIndex } from './PostIndex'
import styles from './Reader.module.css'

/** GET /posts?category=<slug> */
export function CategoryArchivePage() {
  const { slug = '' } = useParams()
  const term = useQuery({
    queryKey: ['category', slug],
    queryFn: () => categoriesApi.get(slug),
    retry: false,
  })

  return (
    <PostIndex
      fixed={{ category: slug }}
      emptyTitle="No posts in this category yet."
      masthead={
        <header className={styles.masthead}>
          <p className={styles.eyebrow}>Category</p>
          <h1 className={styles.title}>{term.data?.name ?? (term.isPending ? <Skeleton width={220} height={32} /> : slug)}</h1>
          {term.data?.description && <p className={styles.lede}>{term.data.description}</p>}
        </header>
      }
    />
  )
}

/** GET /posts?tag=<slug> */
export function TagArchivePage() {
  const { slug = '' } = useParams()
  const term = useQuery({
    queryKey: ['tag', slug],
    queryFn: () => tagsApi.get(slug),
    retry: false,
  })

  return (
    <PostIndex
      fixed={{ tag: slug }}
      emptyTitle="No posts carry this tag yet."
      masthead={
        <header className={styles.masthead}>
          <p className={styles.eyebrow}>Tag</p>
          <h1 className={styles.title}>{term.data?.name ?? (term.isPending ? <Skeleton width={180} height={32} /> : slug)}</h1>
          {term.data?.description && <p className={styles.lede}>{term.data.description}</p>}
        </header>
      }
    />
  )
}

/**
 * GET /posts?author=:id — the author's own posts. `GET /users/:id` is
 * admin-only, so for everyone else the name comes from the posts themselves.
 */
export function AuthorPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()

  const profile = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.get(id),
    enabled: isAdmin(user),
    retry: false,
  })

  const name = profile.data?.name ?? (user?._id === id ? user.name : undefined)

  return (
    <PostIndex
      fixed={{ author: id }}
      emptyTitle="This author hasn't published anything yet."
      masthead={
        <header className={styles.masthead}>
          <div className={styles.authorHead}>
            <Avatar name={name ?? '?'} src={profile.data?.avatar ?? (user?._id === id ? user.avatar : undefined)} size={56} />
            <div className={styles.authorMeta}>
              <p className={styles.eyebrow}>Author</p>
              <h1 className={styles.title}>{name ?? 'Posts by this author'}</h1>
              {profile.data?.bio && <p className={styles.lede}>{profile.data.bio}</p>}
            </div>
          </div>
        </header>
      }
    />
  )
}

/** Directory pages: every category / tag, linking into its archive. */
function TermDirectory({ kind }: { kind: 'categories' | 'tags' }) {
  const api = kind === 'categories' ? categoriesApi : tagsApi
  const terms = useQuery({
    queryKey: [kind, 'directory'],
    queryFn: ({ signal }) => api.list({ limit: 100 }, signal),
  })

  const isCategory = kind === 'categories'

  return (
    <div className={styles.container}>
      <header className={styles.masthead}>
        <p className={styles.eyebrow}>Browse</p>
        <h1 className={styles.title}>{isCategory ? 'Categories' : 'Tags'}</h1>
        <p className={styles.lede}>
          {isCategory
            ? 'The subject areas posts are filed under.'
            : 'Finer-grained labels, for finding related work across categories.'}
        </p>
      </header>

      <section className={`${styles.section} ${styles.bottom}`}>
        {terms.isPending ? (
          <div className={styles.termGrid}>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} height={112} radius="var(--radius-card)" />
            ))}
          </div>
        ) : terms.data && terms.data.items.length > 0 ? (
          <div className={styles.termGrid}>
            {terms.data.items.map((term) => (
              <Link key={term._id} to={`/${isCategory ? 'category' : 'tag'}/${term.slug}`} className={styles.termCard}>
                <span className={styles.termName}>{term.name}</span>
                <span className={styles.termSlug}>/{term.slug}</span>
                {term.description && <span className={styles.termDescription}>{term.description}</span>}
              </Link>
            ))}
          </div>
        ) : (
          <p className={styles.lede}>No {isCategory ? 'categories' : 'tags'} have been created yet.</p>
        )}
      </section>
    </div>
  )
}

export function CategoriesDirectoryPage() {
  return <TermDirectory kind="categories" />
}

export function TagsDirectoryPage() {
  return <TermDirectory kind="tags" />
}
