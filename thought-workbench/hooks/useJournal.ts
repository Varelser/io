import { useState } from "react";
import type { AppState, JournalEntry } from "../types";
import { newId } from "../utils/id";

export function useJournal({ state, updateState }: { state: AppState; updateState: (updater: (draft: AppState) => AppState) => void }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  const journals = state.journals || [];

  const todayEntry = journals.find((j) => j.date === selectedDate) || null;

  const addOrUpdateEntry = (patch: Partial<JournalEntry>) => {
    const now = new Date().toISOString();
    updateState((draft) => {
      if (!draft.journals) draft.journals = [];
      const existing = draft.journals.find((j) => j.date === selectedDate);
      if (existing) {
        Object.assign(existing, patch, { updatedAt: now });
      } else {
        draft.journals.push({
          id: newId("journal"),
          date: selectedDate,
          body: "",
          linkedNodeIds: [],
          linkedTopicIds: [],
          tags: [],
          createdAt: now,
          updatedAt: now,
          ...patch,
        });
      }
      // Sort by date descending
      draft.journals.sort((a, b) => b.date.localeCompare(a.date));
      return draft;
    });
  };

  const deleteEntry = (date: string) => {
    updateState((draft) => {
      draft.journals = (draft.journals || []).filter((j) => j.date !== date);
      return draft;
    });
  };

  return {
    journals,
    selectedDate,
    setSelectedDate,
    todayEntry,
    addOrUpdateEntry,
    deleteEntry,
  };
}
