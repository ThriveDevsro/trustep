import Image from 'next/image'

export function AppDownloadButtons() {
  return (
    <div className="flex flex-wrap items-center gap-3" aria-label="Mobilné aplikácie">
      <span title="Aplikácia pre iPhone bude dostupná čoskoro">
        <Image
          src="/download-on-app-store.svg"
          alt="Download on the App Store"
          width={162}
          height={48}
          className="h-12 w-auto"
        />
      </span>
      <span title="Aplikácia pre Android bude dostupná čoskoro">
        <Image
          src="/get-it-on-google-play.png"
          alt="Get it on Google Play"
          width={155}
          height={60}
          className="h-[60px] w-auto"
        />
      </span>
    </div>
  )
}
