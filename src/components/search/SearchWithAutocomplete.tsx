"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Loader2, Package, Tag, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

interface Suggestion {
  type: "product" | "category" | "seller";
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
}

interface SearchWithAutocompleteProps {
  placeholder?: string;
  className?: string;
}

export function SearchWithAutocomplete({
  placeholder = "Search products, categories...",
  className,
}: SearchWithAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch autocomplete suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search/autocomplete?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (error) {
        console.error("Autocomplete fetch error:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.type === "product") {
      router.push(`/product/${suggestion.id}`);
    } else if (suggestion.type === "seller") {
      router.push(`/store/${suggestion.id}`);
    } else {
      router.push(`/categories/${suggestion.id}`);
    }
    setIsOpen(false);
    setQuery("");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full", className)}>
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => query.length >= 2 && setIsOpen(true)}
              className="pl-10 pr-10"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </form>
        </div>
      </PopoverTrigger>

      {isOpen && query.length >= 2 && (
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          side="bottom"
        >
          <Command>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : suggestions.length > 0 ? (
              <CommandGroup>
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={`${suggestion.type}-${suggestion.id}`}
                    onSelect={() => handleSuggestionClick(suggestion)}
                    className="flex items-center gap-3 p-2 cursor-pointer"
                  >
                    {suggestion.image ? (
                      <Image
                        src={suggestion.image}
                        alt={suggestion.title}
                        width={40}
                        height={40}
                        className="rounded h-10 w-10 object-cover"
                      />
                    ) : suggestion.type === "product" ? (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    ) : suggestion.type === "seller" ? (
                      <Store className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Tag className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {suggestion.title}
                      </p>
                      {suggestion.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {suggestion.subtitle}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <CommandEmpty>No results found for &quot;{query}&quot;</CommandEmpty>
            )}
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}
