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

interface Doctor {
  id: string
  doctor_code: string
  profiles: {
    full_name: string
  }
}

interface DoctorSearchComboboxProps {
  doctors: Doctor[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

const stripDoctorTitle = (value: string): string =>
  value.trim().replace(/^dr(?=$|[\s.,:-])[\s.,:-]*/i, "").trim()

const formatDoctorName = (value: string): string => {
  const nameWithoutTitle = stripDoctorTitle(value)
  return nameWithoutTitle ? `Dr. ${nameWithoutTitle}` : "Dr."
}

export function DoctorSearchCombobox({
  doctors,
  value,
  onValueChange,
  disabled,
  placeholder = "Search doctor...",
}: DoctorSearchComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Filter doctors based on search query (minimum 3 characters)
  const filteredDoctors = React.useMemo(() => {
    const normalized = stripDoctorTitle(searchQuery)
    
    // Show all if search is empty or less than 3 characters
    if (normalized.length < 3) {
      return doctors
    }

    return doctors.filter(doctor => {
      const fullName = stripDoctorTitle(doctor.profiles.full_name).toLowerCase()
      const code = doctor.doctor_code.toLowerCase()
      const search = normalized.toLowerCase()
      
      return fullName.includes(search) || code.includes(search)
    })
  }, [searchQuery, doctors])

  const selectedDoctor = doctors.find(doctor => doctor.id === value)

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
            {selectedDoctor ? (
              <span className="truncate">
                {formatDoctorName(selectedDoctor.profiles.full_name)} ({selectedDoctor.doctor_code})
              </span>
            ) : (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[18rem] max-w-[calc(100vw-2rem)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type 3+ characters to search..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandEmpty>
            {searchQuery.length < 3 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 3 characters to search doctors
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No doctor found matching "{searchQuery}"
              </div>
            )}
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {filteredDoctors.map((doctor) => (
              <CommandItem
                key={doctor.id}
                value={doctor.id}
                onSelect={(currentValue) => {
                  onValueChange(currentValue === value ? "" : currentValue)
                  setOpen(false)
                  setSearchQuery("")
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === doctor.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">
                    {formatDoctorName(doctor.profiles.full_name)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {doctor.doctor_code}
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
