/**
 * NoteList — renders a list of NoteCard components.
 * When `notes` is empty the component renders nothing; the parent is responsible
 * for showing an EmptyState placeholder in that case.
 *
 * @param {object}   props
 * @param {object[]} props.notes      - Array of note objects to display.
 * @param {Function} props.onSelect   - Callback invoked with a note object when a card is clicked.
 * @returns {JSX.Element|null}
 */
import React from 'react';
import NoteCard from './NoteCard.jsx';

/**
 * NoteList renders an unordered list of NoteCard rows, one per note.
 *
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element|null}
 */
function NoteList({ notes, onSelect }) {
  if (!notes || notes.length === 0) {
    return null;
  }

  return (
    <ul
      role="list"
      className="flex flex-col gap-2"
    >
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

export default NoteList;
