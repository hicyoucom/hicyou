import React from "react";

export const BookmarkGrid = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className="fade-in"
          style={{ animationDelay: `${index * 30}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};
