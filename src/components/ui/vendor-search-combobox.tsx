import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface VendorSearchComboboxProps {
  items: Array<{
    id: string
    code: string
    name: string
  }>
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
}

export function VendorSearchCombobox({
  items,
  value,
  onValueChange,
  disabled,
  placeholder = "Search...",
  searchPlaceholder = "Type to search...",
  emptyMessage = "No results found.",
}: VendorSearchComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredItems = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (query.length < 1) return items

    return items.filter(item => {
      const name = item.name.toLowerCase()
      const code = item.code.toLowerCase()
      return name.includes(query) || code.includes(query)
    })
  }, [searchQuery, items])

  const selectedItem = items.find(item => item.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            {selectedItem ? (
              <span className="truncate">
                {selectedItem.code} - {selectedItem.name}
              </span>
            ) : (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandEmpty>
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {filteredItems.map((item) => (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={(currentValue) => {
                  onValueChange(currentValue === value ? "" : currentValue)
                  setOpen(false)
                  setSearchQuery("")
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === item.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.code}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
