import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

interface VehicleAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    label: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
}

export default function VehicleAutocomplete({
    value,
    onChange,
    options,
    label,
    placeholder = 'Select...',
    required = false,
    disabled = false,
}: VehicleAutocompleteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update filtered options when search term or options change
    useEffect(() => {
        const filtered = options.filter(option =>
            option.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredOptions(filtered);
    }, [searchTerm, options]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync internal search term with external value if it matches an option
    // or if we just want to show what's selected.
    // Actually, for an autocomplete, the input value IS the search term usually.
    // But here we might want to allow custom values or restrict to list.
    // Let's allow custom values (like a combobox).

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchTerm(newValue);
        onChange(newValue);
        setIsOpen(true);
    };

    const handleSelectOption = (option: string) => {
        setSearchTerm(option);
        onChange(option);
        setIsOpen(false);
    };

    const handleFocus = () => {
        if (!disabled) {
            setIsOpen(true);
            // If the current value is in the options, we might want to clear search or keep it?
            // Let's keep it simple: input shows current value.
            setSearchTerm(value);
        }
    };

    // When value prop changes externally, update search term
    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    return (
        <div ref={wrapperRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    required={required}
                    disabled={disabled}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder={placeholder}
                    autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                    {isOpen ? <Search className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </div>

            {/* Suggestions Dropdown */}
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleSelectOption(option)}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between transition-colors"
                            >
                                <span className="text-sm text-gray-700">{option}</span>
                                {value === option && <Check className="h-4 w-4 text-blue-600" />}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">
                            No matches found. You can type a custom value.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
