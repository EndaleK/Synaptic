"use client"

import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Edit2,
  Trash2,
  X
} from 'lucide-react'

type ViewMode = 'month' | 'week' | 'day'
type EventType = 'study_session' | 'exam' | 'assignment' | 'review' | 'break' | 'other'

interface StudyEvent {
  id: string
  title: string
  description?: string
  eventType: EventType
  startTime: string
  endTime: string
  allDay: boolean
  location?: string
  color: string
  documentId?: string
}

interface StudyCalendarProps {
  onEventClick?: (event: StudyEvent) => void
}

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  study_session: '#3b82f6', // blue
  exam: '#ef4444', // red
  assignment: '#f59e0b', // amber
  review: '#10b981', // green
  break: '#8b5cf6', // purple
  other: '#6b7280' // gray
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  study_session: 'Study Session',
  exam: 'Exam',
  assignment: 'Assignment',
  review: 'Review',
  break: 'Break',
  other: 'Other'
}

export default function StudyCalendar({ onEventClick }: StudyCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<StudyEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<StudyEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Fetch events for current view
  useEffect(() => {
    fetchEvents()
  }, [currentDate, viewMode])

  const fetchEvents = async () => {
    setIsLoading(true)
    try {
      const startDate = getViewStartDate()
      const endDate = getViewEndDate()

      const response = await fetch(
        `/api/study-schedule/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      )

      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getViewStartDate = (): Date => {
    const date = new Date(currentDate)
    if (viewMode === 'month') {
      date.setDate(1)
      date.setDate(date.getDate() - date.getDay())
    } else if (viewMode === 'week') {
      date.setDate(date.getDate() - date.getDay())
    }
    date.setHours(0, 0, 0, 0)
    return date
  }

  const getViewEndDate = (): Date => {
    const date = new Date(currentDate)
    if (viewMode === 'month') {
      date.setMonth(date.getMonth() + 1)
      date.setDate(0)
      date.setDate(date.getDate() + (6 - date.getDay()))
    } else if (viewMode === 'week') {
      date.setDate(date.getDate() + (6 - date.getDay()))
    }
    date.setHours(23, 59, 59, 999)
    return date
  }

  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedEvent(null)
    setShowEventModal(true)
  }

  const handleEventClick = (event: StudyEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)
    if (onEventClick) {
      onEventClick(event)
    }
  }

  const handleCreateEvent = () => {
    setSelectedEvent(null)
    setSelectedDate(currentDate)
    setShowEventModal(true)
  }

  const getHeaderTitle = (): string => {
    const options: Intl.DateTimeFormatOptions =
      viewMode === 'month'
        ? { month: 'long', year: 'numeric' }
        : viewMode === 'week'
        ? { month: 'short', day: 'numeric', year: 'numeric' }
        : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }

    return currentDate.toLocaleDateString('en-US', options)
  }

  const renderMonthView = () => {
    const startDate = getViewStartDate()
    const weeks = []
    const currentMonth = currentDate.getMonth()

    for (let week = 0; week < 6; week++) {
      const days = []
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + (week * 7) + day)

        const isCurrentMonth = date.getMonth() === currentMonth
        const isToday = isSameDay(date, new Date())
        const dayEvents = events.filter(event =>
          isSameDay(new Date(event.startTime), date)
        )

        days.push(
          <div
            key={`${week}-${day}`}
            onClick={() => handleDateClick(date)}
            className={`
              min-h-[100px] border border-gray-200 dark:border-gray-700 p-2 cursor-pointer
              hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
              ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900 opacity-50' : 'bg-white dark:bg-gray-800'}
              ${isToday ? 'ring-2 ring-accent-primary' : ''}
            `}
          >
            <div className={`
              text-sm font-semibold mb-1
              ${isToday ? 'text-accent-primary' : 'text-gray-700 dark:text-gray-300'}
            `}>
              {date.getDate()}
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map(event => (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEventClick(event)
                  }}
                  className="text-xs px-2 py-1 rounded truncate hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: event.color, color: 'white' }}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        )
      }
      weeks.push(
        <div key={week} className="grid grid-cols-7">
          {days}
        </div>
      )
    }

    return (
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          {weeks}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const startDate = getViewStartDate()
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      return date
    })

    return (
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-8 min-w-[800px]">
          {/* Time column */}
          <div className="border-r border-gray-200 dark:border-gray-700">
            <div className="h-12 border-b border-gray-200 dark:border-gray-700"></div>
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 p-1">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((date, dayIndex) => {
            const isToday = isSameDay(date, new Date())
            const dayEvents = events.filter(event =>
              isSameDay(new Date(event.startTime), date)
            )

            return (
              <div key={dayIndex} className="border-r border-gray-200 dark:border-gray-700">
                {/* Day header */}
                <div className={`
                  h-12 border-b border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center
                  ${isToday ? 'bg-accent-primary text-white' : 'bg-gray-50 dark:bg-gray-800'}
                `}>
                  <div className="text-xs font-semibold">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-bold">
                    {date.getDate()}
                  </div>
                </div>

                {/* Hour cells */}
                <div className="relative">
                  {hours.map(hour => (
                    <div
                      key={hour}
                      onClick={() => handleDateClick(new Date(date.setHours(hour, 0, 0, 0)))}
                      className="h-16 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    ></div>
                  ))}

                  {/* Events overlay */}
                  {dayEvents.map(event => {
                    const start = new Date(event.startTime)
                    const end = new Date(event.endTime)
                    const startHour = start.getHours() + start.getMinutes() / 60
                    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEventClick(event)
                        }}
                        className="absolute left-1 right-1 rounded px-2 py-1 text-xs text-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        style={{
                          backgroundColor: event.color,
                          top: `${startHour * 64}px`,
                          height: `${duration * 64}px`,
                          minHeight: '32px'
                        }}
                      >
                        <div className="font-semibold truncate">{event.title}</div>
                        <div className="text-xs opacity-90 truncate">
                          {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const dayEvents = events.filter(event =>
      isSameDay(new Date(event.startTime), currentDate)
    )

    return (
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-2 min-w-[500px]">
          {/* Time column */}
          <div className="border-r border-gray-200 dark:border-gray-700">
            {hours.map(hour => (
              <div
                key={hour}
                onClick={() => handleDateClick(new Date(currentDate.setHours(hour, 0, 0, 0)))}
                className="h-20 border-b border-gray-200 dark:border-gray-700 p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              >
                {hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`}
              </div>
            ))}
          </div>

          {/* Events column */}
          <div className="relative">
            {hours.map(hour => (
              <div key={hour} className="h-20 border-b border-gray-200 dark:border-gray-700"></div>
            ))}

            {/* Events overlay */}
            {dayEvents.map(event => {
              const start = new Date(event.startTime)
              const end = new Date(event.endTime)
              const startHour = start.getHours() + start.getMinutes() / 60
              const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

              return (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="absolute left-2 right-2 rounded-lg p-3 text-white cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
                  style={{
                    backgroundColor: event.color,
                    top: `${startHour * 80}px`,
                    height: `${duration * 80}px`,
                    minHeight: '60px'
                  }}
                >
                  <div className="font-semibold text-lg mb-1">{event.title}</div>
                  <div className="text-sm opacity-90 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {' '}
                    {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                  {event.location && (
                    <div className="text-sm opacity-90 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-accent-primary" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Study Calendar
            </h2>
          </div>
          <button
            onClick={handleCreateEvent}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>

        {/* Navigation and View Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={navigatePrevious}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={navigateToday}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-semibold transition-colors"
            >
              Today
            </button>
            <button
              onClick={navigateNext}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="ml-4 text-lg font-semibold text-gray-900 dark:text-white">
              {getHeaderTitle()}
            </span>
          </div>

          {/* View mode selector */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-4 py-2 rounded-md text-sm font-semibold transition-all capitalize
                  ${viewMode === mode
                    ? 'bg-white dark:bg-gray-600 text-accent-primary shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}
                `}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[500px]">
            <div className="text-gray-600 dark:text-gray-400">Loading events...</div>
          </div>
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </>
        )}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          initialDate={selectedDate || currentDate}
          onClose={() => {
            setShowEventModal(false)
            setSelectedEvent(null)
            setSelectedDate(null)
          }}
          onSave={() => {
            fetchEvents()
            setShowEventModal(false)
            setSelectedEvent(null)
            setSelectedDate(null)
          }}
        />
      )}
    </div>
  )
}

// Event Modal Component
interface EventModalProps {
  event: StudyEvent | null
  initialDate: Date
  onClose: () => void
  onSave: () => void
}

function EventModal({ event, initialDate, onClose, onSave }: EventModalProps) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    eventType: event?.eventType || 'study_session' as EventType,
    startTime: event?.startTime || initialDate.toISOString().slice(0, 16),
    endTime: event?.endTime || new Date(initialDate.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
    allDay: event?.allDay || false,
    location: event?.location || '',
    color: event?.color || EVENT_TYPE_COLORS.study_session
  })

  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const url = event ? `/api/study-schedule/events/${event.id}` : '/api/study-schedule/events'
      const method = event ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSave()
      }
    } catch (error) {
      console.error('Failed to save event:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!event || !confirm('Are you sure you want to delete this event?')) return

    try {
      const response = await fetch(`/api/study-schedule/events/${event.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onSave()
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {event ? 'Edit Event' : 'New Event'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-primary"
              placeholder="Study Session, Exam, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Event Type
            </label>
            <select
              value={formData.eventType}
              onChange={(e) => {
                const eventType = e.target.value as EventType
                setFormData({
                  ...formData,
                  eventType,
                  color: EVENT_TYPE_COLORS[eventType]
                })
              }}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-primary"
            >
              {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                End Time
              </label>
              <input
                type="datetime-local"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Location (Optional)
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-primary"
              placeholder="Library, Room 101, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-primary"
              placeholder="Add notes about this event..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {event && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : event ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
