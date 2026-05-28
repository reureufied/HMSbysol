import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

const CustomSearchDropdown = ({ value, onChange, options, placeholder, onSelectExisting }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menuStyle, setMenuStyle] = useState({});
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 2,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setIsOpen(true);
    setSearch('');
  };

  const sortedOptions = [...options].sort((a, b) => a.name.localeCompare(b.name));
  const filteredOptions = sortedOptions.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const hasExactMatch = options.some(o => o.name.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <div
        ref={triggerRef}
        className={`dropdown-trigger ${!value ? 'placeholder' : ''}`}
        onClick={openDropdown}
      >
        <span className="trigger-text">{value || `${placeholder} 선택`}</span>
        <ChevronDown size={16} />
      </div>
      {isOpen && (
        <div className="dropdown-menu" style={menuStyle}>
          <div className="dropdown-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              autoFocus
              placeholder="검색/입력"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { onChange(search.trim()); setIsOpen(false); }
                if (e.key === 'Escape') setIsOpen(false);
              }}
            />
          </div>
          <div className="dropdown-list-container">
            {filteredOptions.map((opt) => (
              <div
                key={opt.id}
                className="dropdown-item"
                onClick={() => { onChange(opt.name); if (onSelectExisting) onSelectExisting(opt); setIsOpen(false); }}
              >
                {opt.name}
              </div>
            ))}
            {search.trim() !== '' && !hasExactMatch && (
              <div className="dropdown-item new-item" onClick={() => { onChange(search.trim()); setIsOpen(false); }}>
                <span className="add-badge">추가</span> {search}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSearchDropdown;
