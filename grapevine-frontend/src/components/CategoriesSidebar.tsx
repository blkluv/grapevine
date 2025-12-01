import { Link } from 'react-router-dom'
import { useCategories } from '@/hooks/useCategories'
import { Loader } from '@/components/ui'

interface Category {
  id: string
  name: string
}

interface CategoriesSidebarViewProps {
  categories: Category[]
  categoriesLoading: boolean
}

// Neobrutalism styles
const styles = {
  container: 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
  title: 'text-2xl font-black uppercase px-6 py-4 border-b-4 border-black',
  emptyText: 'text-base font-bold text-gray-800 px-6 py-4',
  linkContainer: '',
  link: 'block w-full text-base font-black uppercase bg-white border-b-4 border-black px-6 py-4 hover:bg-gray-100 active:bg-gray-200 transition-colors',
}

export function CategoriesSidebarView({ categories, categoriesLoading }: CategoriesSidebarViewProps) {
  return (
    <div className="w-full md:w-64 flex-shrink-0">
      <div className={styles.container}>
        <h2 className={styles.title}>
          Categories
        </h2>

        {categoriesLoading ? (
          <div className="flex justify-center py-4">
            <Loader size="md" />
          </div>
        ) : categories.length === 0 ? (
          <p className={styles.emptyText}>No categories found</p>
        ) : (
          <div className={styles.linkContainer}>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.id}`}
                className={styles.link}
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CategoriesSidebar() {
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories()
  const categories = categoriesData || []

  return (
    <CategoriesSidebarView
      categories={categories}
      categoriesLoading={categoriesLoading}
    />
  )
}
