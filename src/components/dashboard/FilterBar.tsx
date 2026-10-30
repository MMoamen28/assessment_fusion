"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { COMPLAINT_CATEGORIES } from "@/lib/domain/constants";

interface AssignableUser {
  id: string;
  name: string;
}

interface FilterBarProps {
  isAdmin: boolean;
  assignableUsers?: AssignableUser[];
}

export function FilterBar({ isAdmin, assignableUsers = [] }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const currentPriority = searchParams.get("priority") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentAssignee = searchParams.get("assignee") ?? "";

  const [searchInputValue, setSearchInputValue] = useState(currentQ);
  const [prevQ, setPrevQ] = useState(currentQ);

  // Sync input value if URL changes externally
  if (currentQ !== prevQ) {
    setPrevQ(currentQ);
    setSearchInputValue(currentQ);
  }

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set(key, value.trim());
    } else {
      params.delete(key);
    }
    // Changing any filter resets page to 1
    params.delete("page");

    startTransition(() => {
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    });
  };

  // Debounced search (300ms)
  useEffect(() => {
    if (searchInputValue === currentQ) return;

    const timer = setTimeout(() => {
      updateParam("q", searchInputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInputValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClearFilters = () => {
    setSearchInputValue("");
    startTransition(() => {
      router.replace(pathname);
    });
  };

  const hasActiveFilters = Boolean(
    currentQ || currentStatus || currentPriority || currentCategory || currentAssignee,
  );

  return (
    <div className={`filter-bar ${isPending ? "filter-bar-pending" : ""}`}>
      <div className="filter-grid">
        {/* Search Input */}
        <div className="filter-control">
          <label htmlFor="filter-search">Search</label>
          <input
            id="filter-search"
            type="search"
            className="input"
            placeholder="Search reference, title, submitter..."
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="filter-control">
          <label htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            className="select"
            value={currentStatus}
            onChange={(e) => updateParam("status", e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="filter-control">
          <label htmlFor="filter-priority">Priority</label>
          <select
            id="filter-priority"
            className="select"
            value={currentPriority}
            onChange={(e) => updateParam("priority", e.target.value)}
          >
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="filter-control">
          <label htmlFor="filter-category">Category</label>
          <select
            id="filter-category"
            className="select"
            value={currentCategory}
            onChange={(e) => updateParam("category", e.target.value)}
          >
            <option value="">All categories</option>
            {COMPLAINT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee Filter */}
        <div className="filter-control">
          <label htmlFor="filter-assignee">Assignee</label>
          <select
            id="filter-assignee"
            className="select"
            value={currentAssignee}
            onChange={(e) => updateParam("assignee", e.target.value)}
          >
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            <option value="me">Me</option>
            {isAdmin && assignableUsers.length > 0 && (
              <optgroup label="Staff Members">
                {assignableUsers.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Clear Filters Action */}
        <div className="filter-actions">
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClearFilters}
              disabled={isPending}
            >
              Clear filters
            </button>
          )}
          {isPending && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                alignSelf: "center",
              }}
            >
              Loading...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
