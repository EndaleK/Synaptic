"use client"

import { useState, useEffect } from "react"
import { MapPin, Globe, ChevronDown, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Jurisdiction {
  code: string
  name: string
  country: string
  type: string
  regulationLevel: string
  requirements: {
    notification?: {
      required: boolean
      deadline?: string
      to?: string
    }
    curriculum?: {
      subjects_required?: string[]
      education_plan_required?: boolean
    }
    assessment?: {
      required: boolean
      assessments_per_year?: number
      conducted_by?: string
    }
    funding?: {
      available: boolean
      amount_per_student?: number
      currency?: string
    }
  }
  notes?: string
}

interface JurisdictionSelectorProps {
  value?: { code: string; country: string }
  onChange: (code: string, country: string) => void
  disabled?: boolean
  showRequirements?: boolean
  className?: string
}

const COUNTRIES = [
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "US", name: "United States", flag: "🇺🇸" },
]

export default function JurisdictionSelector({
  value,
  onChange,
  disabled = false,
  showRequirements = true,
  className,
}: JurisdictionSelectorProps) {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState(value?.country || "CA")
  const [selectedCode, setSelectedCode] = useState(value?.code || "AB")
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchJurisdictions()
  }, [])

  useEffect(() => {
    if (value?.code && value?.country) {
      setSelectedCode(value.code)
      setSelectedCountry(value.country)
    }
  }, [value])

  const fetchJurisdictions = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/jurisdictions", { credentials: "include" })
      if (!res.ok) throw new Error("Failed to fetch jurisdictions")
      const data = await res.json()
      setJurisdictions(data.jurisdictions || [])
    } catch (err) {
      console.error("Failed to fetch jurisdictions:", err)
      setError("Could not load jurisdictions")
      // Provide fallback data for Alberta
      setJurisdictions([
        {
          code: "AB",
          name: "Alberta",
          country: "CA",
          type: "province",
          regulationLevel: "moderate",
          requirements: {
            notification: {
              required: true,
              deadline: "September 30",
              to: "supervising_school_board",
            },
            curriculum: {
              subjects_required: ["Language Arts", "Mathematics", "Science", "Social Studies"],
              education_plan_required: true,
            },
            assessment: {
              required: true,
              assessments_per_year: 2,
              conducted_by: "supervising_teacher",
            },
            funding: {
              available: true,
              amount_per_student: 901,
              currency: "CAD",
            },
          },
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const filteredJurisdictions = jurisdictions.filter(
    (j) => j.country === selectedCountry
  )

  const selectedJurisdiction = jurisdictions.find(
    (j) => j.code === selectedCode && j.country === selectedCountry
  )

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
    // Select first jurisdiction in new country
    const firstInCountry = jurisdictions.find((j) => j.country === country)
    if (firstInCountry) {
      setSelectedCode(firstInCountry.code)
      onChange(firstInCountry.code, country)
    }
  }

  const handleJurisdictionChange = (code: string) => {
    setSelectedCode(code)
    onChange(code, selectedCountry)
    setIsOpen(false)
  }

  const getRegulationBadge = (level: string) => {
    const colors = {
      none: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      moderate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    }
    return colors[level as keyof typeof colors] || colors.moderate
  }

  if (loading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Country Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Globe className="inline w-4 h-4 mr-1.5 text-accent-primary" />
          Country
        </label>
        <div className="flex gap-2">
          {COUNTRIES.map((country) => (
            <button
              key={country.code}
              onClick={() => handleCountryChange(country.code)}
              disabled={disabled}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all",
                selectedCountry === country.code
                  ? "bg-accent-primary/10 border-accent-primary text-accent-primary dark:bg-accent-primary/20"
                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-accent-primary/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="text-xl">{country.flag}</span>
              <span className="font-medium">{country.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Province/State Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <MapPin className="inline w-4 h-4 mr-1.5 text-accent-primary" />
          {selectedCountry === "CA" ? "Province/Territory" : "State"}
        </label>
        <div className="relative">
          <button
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 border rounded-lg bg-white dark:bg-gray-800 text-left transition-all",
              isOpen
                ? "border-accent-primary ring-2 ring-accent-primary/20"
                : "border-gray-200 dark:border-gray-700 hover:border-accent-primary/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="text-gray-900 dark:text-white">
              {selectedJurisdiction?.name || "Select..."}
            </span>
            <ChevronDown
              className={cn(
                "w-5 h-5 text-gray-400 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>

          {isOpen && (
            <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
              {filteredJurisdictions.map((j) => (
                <button
                  key={j.code}
                  onClick={() => handleJurisdictionChange(j.code)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                    j.code === selectedCode
                      ? "bg-accent-primary/10 text-accent-primary"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  )}
                >
                  <span>{j.name}</span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      getRegulationBadge(j.regulationLevel)
                    )}
                  >
                    {j.regulationLevel}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Requirements Summary */}
      {showRequirements && selectedJurisdiction && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-accent-primary" />
            {selectedJurisdiction.name} Homeschool Requirements
          </h4>

          <div className="space-y-2 text-sm">
            {selectedJurisdiction.requirements.notification?.required && (
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">
                  Registration required by{" "}
                  <strong className="text-gray-900 dark:text-white">
                    {selectedJurisdiction.requirements.notification.deadline}
                  </strong>
                </span>
              </div>
            )}

            {selectedJurisdiction.requirements.curriculum?.education_plan_required && (
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">
                  Education plan required
                </span>
              </div>
            )}

            {selectedJurisdiction.requirements.curriculum?.subjects_required && (
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">
                  Core subjects:{" "}
                  <strong className="text-gray-900 dark:text-white">
                    {selectedJurisdiction.requirements.curriculum.subjects_required.join(", ")}
                  </strong>
                </span>
              </div>
            )}

            {selectedJurisdiction.requirements.assessment?.required && (
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-900 dark:text-white">
                    {selectedJurisdiction.requirements.assessment.assessments_per_year}
                  </strong>{" "}
                  assessments per year by{" "}
                  {selectedJurisdiction.requirements.assessment.conducted_by?.replace(/_/g, " ")}
                </span>
              </div>
            )}

            {selectedJurisdiction.requirements.funding?.available && (
              <div className="flex items-start gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <span className="text-lg">💰</span>
                <span className="text-gray-600 dark:text-gray-400">
                  Funding available:{" "}
                  <strong className="text-green-600 dark:text-green-400">
                    ${selectedJurisdiction.requirements.funding.amount_per_student}{" "}
                    {selectedJurisdiction.requirements.funding.currency}/student
                  </strong>
                </span>
              </div>
            )}
          </div>

          {selectedJurisdiction.notes && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic">
              {selectedJurisdiction.notes}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {error} - Using cached data
        </p>
      )}
    </div>
  )
}
