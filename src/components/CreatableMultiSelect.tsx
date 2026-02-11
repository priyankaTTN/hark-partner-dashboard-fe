/**
 * Reusable Creatable Multi-Select using react-select/creatable.
 * Used for Tags, Genres, Tones (QUESTION_DETAIL_COMPONENT_SPEC §7, CreatableSelect).
 * See: https://react-select.com/creatable
 */
import CreatableSelect from "react-select/creatable"
import type { MultiValue, StylesConfig } from "react-select"

export type CreatableOption = {
  label: string
  value: string
  /** Optional id (e.g. _id from API); when creating new, may be undefined until saved */
  id?: string
}

type CreatableMultiSelectProps = {
  /** Available options (from API or local). value in each option should be the id used when saving. */
  options: CreatableOption[]
  /** Currently selected options (label + value; value is used as id when calling onChangeIds). */
  value: CreatableOption[]
  /** Called when selection changes. Receives array of selected option values (ids). */
  onChangeIds: (ids: string[]) => void
  /** Placeholder when empty */
  placeholder?: string
  /** Label shown above the select */
  label?: string
  /** Disabled state */
  disabled?: boolean
  /** When user creates a new option (types and presses Enter or "Create ..."). Optional: parent can create via API and refetch options. */
  onCreateOption?: (inputValue: string) => void
  /** Optional class name for the wrapper */
  className?: string
}

/** Map list items { _id, name } to react-select options { label, value } with value = id for API. */
export function mapToCreatableOptions(
  list: Array<{ _id: string; name: string }>
): CreatableOption[] {
  return list.map((item) => ({
    label: item.name,
    value: item._id,
    id: item._id,
  }))
}

/** Get selected options from options list and current ids. For ids not in options (e.g. just-created), returns { label: id, value: id }. */
export function getSelectedOptions(
  options: CreatableOption[],
  ids: string[]
): CreatableOption[] {
  const byValue = new Map<string, CreatableOption>()
  options.forEach((o) => byValue.set(o.value, o))
  return ids.map((id) => byValue.get(id) ?? { label: id, value: id })
}

const defaultStyles: StylesConfig<CreatableOption, true> = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    borderColor: state.isFocused ? "var(--ring)" : "hsl(var(--border))",
    boxShadow: state.isFocused ? "0 0 0 1px var(--ring)" : "none",
    "&:hover": { borderColor: "hsl(var(--border))" },
  }),
  placeholder: (base) => ({ ...base, color: "hsl(var(--muted-foreground))" }),
  multiValue: (base) => ({ ...base, borderRadius: 6 }),
  input: (base) => ({ ...base, color: "hsl(var(--foreground))" }),
}

export function CreatableMultiSelect({
  options,
  value,
  onChangeIds,
  placeholder = "Select or type to create...",
  label,
  disabled = false,
  onCreateOption,
  className = "",
}: CreatableMultiSelectProps) {
  const handleChange = (selected: MultiValue<CreatableOption>) => {
    const ids = (selected ?? []).map((o) => o.value)
    onChangeIds(ids)
  }

  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      )}
      <CreatableSelect<CreatableOption, true>
        isMulti
        options={options}
        value={value}
        onChange={handleChange}
        onCreateOption={onCreateOption}
        placeholder={placeholder}
        isDisabled={disabled}
        styles={defaultStyles}
        formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
      />
    </div>
  )
}
