import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import LessonEditor from '../src/components/courses/LessonEditor';

describe('LessonEditor', () => {
  test('renders safely when the lesson changes from null to a real lesson', () => {
    const props = {
      onSave: vi.fn(),
      onDelete: vi.fn(),
      onUploadMaterial: vi.fn(),
      onDeleteMaterial: vi.fn(),
    };

    const { rerender } = render(<LessonEditor lesson={null} {...props} />);

    expect(
      screen.getByText(/select a lesson from the course outline or create a new one/i)
    ).toBeInTheDocument();

    rerender(
      <LessonEditor
        lesson={{
          id: 'lesson-1',
          title: 'New Lesson 1',
          content: '',
          order: 1,
          materials: [],
        }}
        {...props}
      />
    );

    expect(screen.getByDisplayValue('New Lesson 1')).toBeInTheDocument();
    expect(screen.getByText('Lesson preview will appear here as you type.')).toBeInTheDocument();
  });
});
