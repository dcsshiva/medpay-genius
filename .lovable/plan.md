

## Add Smart Search with Autocomplete to Cash/Insurance Payment Management

### Current State
The Cash/Insurance Payment Management screens already have a search bar with filter chips (All Fields, Doctor Name, Doctor Code, Patient Name). However, the search is basic text filtering -- it does NOT provide autocomplete suggestions as you type, unlike the Lite versions which have smart dropdown suggestions.

### What Changes
Add smart autocomplete suggestions to the existing search in `PaymentManagement.tsx`, matching the behavior in the Lite versions:
- When user types 2+ characters, fetch matching suggestions from the database
- Show a dropdown with clickable suggestions
- Works for Doctor Name, Doctor Code, and Patient Name filters

### Technical Details

**File: `src/components/PaymentManagement.tsx`**

1. **Add imports**: Import `useCallback` from React, `debounce` from `@/lib/utils`, `Popover`/`PopoverContent`/`PopoverTrigger`, `Command`/`CommandEmpty`/`CommandGroup`/`CommandItem`/`CommandList`, and `ScrollArea`

2. **Add state variables** (near line 214):
   - `suggestions: string[]` -- autocomplete suggestion list
   - `showSuggestions: boolean` -- controls dropdown visibility
   - `loadingSuggestions: boolean` -- loading state

3. **Add `fetchSuggestions` function** (debounced, 300ms):
   - For `doctor_name`: query `doctors` table, `ilike` on `full_name`
   - For `doctor_code`: query `doctors` table, `ilike` on `doctor_code`
   - For `patient_name`: query `visits` table, `ilike` on `patient_name`
   - For `insurance_name`: query `insurance_companies` table, `ilike` on `company_name`
   - Limit to 10 results, deduplicate

4. **Update search input** (around line 3000-3008):
   - Wrap the existing `Input` in a `Popover` component
   - On input change, call `fetchSuggestions` when 2+ characters are typed
   - Show suggestion dropdown with clickable items
   - On suggestion select, set `searchTerm` to the selected value and close dropdown

### Visual Changes
- When typing in the search box with a filter selected, a dropdown appears showing matching suggestions from the database
- Clicking a suggestion fills the search box and filters results
- Loading state shown while fetching suggestions
