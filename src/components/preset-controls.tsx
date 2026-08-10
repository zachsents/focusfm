import { IconSavedItemsOutlineDuo18 } from "nucleo-ui-outline-duo-18"
import { IconCheck, IconFloppyDisk, IconTrash } from "nucleo-micro-bold"
import { useState, type FormEvent } from "react"

import { Button } from "#/components/ui/button"
import { ButtonGroup } from "#/components/ui/button-group"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { Empty, EmptyMedia, EmptyTitle } from "#/components/ui/empty"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#/components/ui/popover"
import type { MixerPreset } from "#/lib/mixer-store"

interface PresetControlsProps {
  presets: readonly MixerPreset[]
  activePreset?: MixerPreset
  hasUnsavedChanges: boolean
  canSave: boolean
  onSave: (name: string) => void
  onLoad: (preset: MixerPreset) => void
  onDelete: (presetId: string) => void
  onSaveChanges: () => void
  onDiscardChanges: () => void
}

/** Keeps preset saving and recall inside a compact shadcn popover. */
export function PresetControls({
  presets,
  activePreset,
  hasUnsavedChanges,
  canSave,
  onSave,
  onLoad,
  onDelete,
  onSaveChanges,
  onDiscardChanges,
}: PresetControlsProps) {
  const [name, setName] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return
    onSave(trimmedName)
    setName("")
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className="h-13 min-h-13 rounded-2xl pr-[0.85rem] has-data-[icon=inline-start]:pl-[0.85rem]"
            size="lg"
            variant="skeuomorphic"
            aria-label={
              activePreset
                ? `${activePreset.name}${hasUnsavedChanges ? ", unsaved changes" : ""}`
                : "Save or load a preset"
            }
          />
        }
      >
        <IconFloppyDisk data-icon="inline-start" />
        <span className="max-w-40 truncate">
          {activePreset?.name ?? "Save"}
        </span>
        {hasUnsavedChanges ? (
          <span
            className="size-[0.42rem] rounded-full bg-[var(--ink)]"
            aria-hidden="true"
          />
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[min(30rem,calc(100dvh-6rem))] w-[min(22rem,calc(100vw-1.5rem))] gap-[0.8rem] overflow-y-auto rounded-[1.1rem] p-4"
        align="end"
        side="bottom"
        sideOffset={10}
      >
        <PopoverHeader>
          <PopoverTitle>Presets</PopoverTitle>
        </PopoverHeader>

        {activePreset ? (
          <div className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-[var(--paper-deep)] p-[0.65rem]">
            <div className="grid min-w-0">
              <strong className="truncate text-[0.78rem]">
                {activePreset.name}
              </strong>
              <small className="text-[0.65rem] text-[var(--ink-soft)]">
                {hasUnsavedChanges ? "Edited" : "Current"}
              </small>
            </div>
            {hasUnsavedChanges ? (
              <ButtonGroup>
                <Button size="sm" onClick={onSaveChanges}>
                  Save changes
                </Button>
                <Button size="sm" variant="outline" onClick={onDiscardChanges}>
                  Discard
                </Button>
              </ButtonGroup>
            ) : null}
          </div>
        ) : null}

        <form
          className="grid gap-[0.45rem] border-b border-[var(--line)] pb-3"
          onSubmit={handleSubmit}
        >
          <Label className="sr-only" htmlFor="preset-name">
            Preset name
          </Label>
          <div className="flex gap-[0.4rem]">
            <Input
              id="preset-name"
              name="presetName"
              value={name}
              maxLength={30}
              disabled={!canSave}
              placeholder="Deep work"
              onChange={(event) => setName(event.currentTarget.value)}
            />
            <Button type="submit" size="sm" disabled={!canSave || !name.trim()}>
              <IconFloppyDisk data-icon="inline-start" />
              Save
            </Button>
          </div>
        </form>

        {presets.length ? (
          <div className="grid gap-[0.4rem]">
            {presets.map((preset) => (
              <ButtonGroup className="w-full" key={preset.id}>
                <Button
                  className="flex-1 justify-between"
                  variant="outline"
                  onClick={() => onLoad(preset)}
                >
                  {preset.name}
                  {preset.id === activePreset?.id ? (
                    <IconCheck aria-label="Current preset" />
                  ) : (
                    <small className="grid size-[1.1rem] place-items-center rounded-full bg-[var(--paper-deep)] text-[0.58rem]">
                      {preset.channels.length}
                    </small>
                  )}
                </Button>
                <Button
                  className="text-[var(--ink-soft)] [@media(hover:hover)]:hover:text-[var(--danger)]"
                  variant="outline"
                  size="icon"
                  aria-label={`Delete ${preset.name} preset`}
                  onClick={() => onDelete(preset.id)}
                >
                  <IconTrash />
                </Button>
              </ButtonGroup>
            ))}
          </div>
        ) : (
          <Empty className="min-h-28 border border-[var(--line)] p-4">
            <EmptyMedia variant="icon">
              <IconSavedItemsOutlineDuo18 />
            </EmptyMedia>
            <EmptyTitle>No presets</EmptyTitle>
          </Empty>
        )}
      </PopoverContent>
    </Popover>
  )
}
