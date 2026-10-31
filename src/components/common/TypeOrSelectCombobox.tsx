import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";

interface TypeOrSelectComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  allowCustom?: boolean;
  customBadge?: string;
}

export const TypeOrSelectCombobox: React.FC<TypeOrSelectComboboxProps> = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select or type...",
  required = false,
  disabled = false,
  helperText,
  allowCustom = true,
  customBadge,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmedInput = inputValue.trim().toLowerCase();

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(trimmedInput),
  );

  const exactMatchExists = options.some(
    (opt) => opt.toLowerCase() === trimmedInput,
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInputValue(newVal);
    onChange(newVal);
    setIsOpen(true);
  };

  const handleSelectOption = (opt: string) => {
    setInputValue(opt);
    onChange(opt);
    setIsOpen(false);
  };

  const handleSelectCustom = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      setInputValue(trimmed);
      onChange(trimmed);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full px-3.5 py-2.5 pr-9 text-xs sm:text-sm rounded-xl border font-medium transition-all ${
            disabled
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              : "bg-white border-slate-300 text-slate-800 focus:ring-2 focus:ring-red-500 focus:border-red-500 hover:border-slate-400"
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {customBadge && (
        <span className="text-[10px] text-amber-700 font-medium mt-1 flex items-center gap-1">
          {customBadge}
        </span>
      )}

      {helperText && !customBadge && (
        <span className="text-[10px] text-slate-400 mt-0.5 block">
          {helperText}
        </span>
      )}

      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 text-xs">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected =
                opt.toLowerCase() === (value || "").toLowerCase();
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between transition-colors ${
                    isSelected
                      ? "bg-red-50 text-red-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50 font-medium"
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && <Check className="w-4 h-4 text-red-600 shrink-0 ml-2" />}
                </button>
              );
            })
          ) : (
            <div className="px-3.5 py-2.5 text-slate-400 italic text-center">
              No predefined match found
            </div>
          )}

          {allowCustom && inputValue.trim().length > 0 && !exactMatchExists && (
            <button
              type="button"
              onClick={handleSelectCustom}
              className="w-full px-3.5 py-2.5 text-left text-amber-700 font-semibold bg-amber-50 hover:bg-amber-100 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">
                Use typed value: <strong>"{inputValue.trim()}"</strong>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
