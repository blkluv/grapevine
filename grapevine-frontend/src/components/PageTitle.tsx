interface PageTitleProps {
  children: React.ReactNode
  className?: string
}

export function PageTitle({ children, className = '' }: PageTitleProps) {
  return (
    <div className={`flex justify-center ${className}`}>
      <div className="relative">
        {/* Inner border */}
        <div className="relative bg-white border-4 border-[#808080]">
          <div className="bg-gradient-to-b from-[#dfdfdf] to-[#c0c0c0] px-4 lg:px-12 py-3 lg:py-4 border-t-4 border-l-4 border-white border-b-4 border-r-4 border-b-[#808080] border-r-[#808080]">
            <h1
              className="text-xl lg:text-4xl font-black uppercase tracking-wide"
              style={{
                textShadow: '2px 2px 0px rgba(0,0,0,0.15), 1px 1px 0px rgba(255,255,255,0.5)'
              }}
            >
              {children}
            </h1>
          </div>
        </div>
      </div>
    </div>
  )
}
