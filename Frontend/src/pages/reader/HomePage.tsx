import { PostIndex } from './PostIndex'
import styles from './Reader.module.css'

export function HomePage() {
  return (
    <PostIndex
      showFilters
      showHero
      emptyTitle="Nothing has come off the anvil yet."
      emptyBody="Published posts will appear here as soon as the first one is quenched."
      masthead={
        <header className={styles.masthead}>
          <p className={styles.eyebrow}>Latest from the forge</p>
          <h1 className={styles.title}>Work that has been quenched and set.</h1>
          <p className={styles.lede}>
            Everything here is finished and published. Drafts stay on the anvil in the Workshop until they're ready.
          </p>
        </header>
      }
    />
  )
}
