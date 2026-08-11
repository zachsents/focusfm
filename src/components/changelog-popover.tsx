import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#/components/ui/popover"

/** Shows commit subjects embedded from Git during the current build. */
export function ChangelogPopover() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className="h-13 min-h-13 rounded-2xl px-[0.85rem]"
            size="lg"
            variant="skeuomorphic"
            aria-label="View recent changes"
          />
        }
      >
        Updates
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(23rem,calc(100vw-1.5rem))] gap-3 rounded-[1.1rem] p-4"
        align="end"
        side="bottom"
        sideOffset={10}
      >
        <PopoverHeader>
          <PopoverTitle>What’s new</PopoverTitle>
          <PopoverDescription>
            Recent changes included in this release.
          </PopoverDescription>
        </PopoverHeader>

        {__FOCUSFM_CHANGELOG__.length ? (
          <ol className="grid gap-1.5">
            {__FOCUSFM_CHANGELOG__.map((entry, index) => (
              <li
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 rounded-[0.75rem] border border-[var(--line)] bg-[var(--surface)] p-2.5"
                key={entry.hash}
              >
                <Badge
                  className="mt-[0.05rem] font-mono text-[0.58rem]"
                  variant={index === 0 ? "default" : "outline"}
                >
                  {entry.hash}
                </Badge>
                <div className="min-w-0">
                  <p className="text-[0.75rem] leading-snug font-bold text-[var(--ink)]">
                    {entry.message}
                  </p>
                  <time
                    className="mt-0.5 block text-[0.62rem] text-[var(--ink-soft)]"
                    dateTime={entry.date}
                  >
                    {entry.date} · {entry.author}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-[0.75rem] border border-[var(--line)] bg-[var(--surface)] p-3 text-[0.72rem] text-[var(--ink-soft)]">
            Release notes aren’t available for this build.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
