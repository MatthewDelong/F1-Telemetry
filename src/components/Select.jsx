import React from 'react';
import classNames from 'classnames';
import ReactSelect, { components } from 'react-select';

const CustomValueContainer = ({ children, ...props }) => {
  const { hasValue, selectProps } = props;
  const rawPlaceholder = selectProps.placeholder || '';
  const tagLabel = rawPlaceholder.replace(/^select\s+/i, '').trim().toUpperCase();

  return (
    <components.ValueContainer
      {...props}
      className={classNames(
        'custom-select-container flex items-center gap-6 overflow-hidden h-full pl-3',
        hasValue ? 'has-value' : ''
      )}
    >
      {hasValue && tagLabel ? (
        <span className="text-[0.95rem] font-mono font-bold tracking-wider text-neutral-400 uppercase select-none shrink-0 bg-white/[0.08] border border-white/12 px-5 py-1 rounded inline-flex items-center justify-center leading-none">
          {tagLabel}
        </span>
      ) : null}
      <div className="flex-1 min-w-0 flex items-center h-full overflow-hidden">
        {children}
      </div>
    </components.ValueContainer>
  );
};

const CustomDropdownIndicator = (props) => {
  return (
    <components.DropdownIndicator {...props} className="cursor-pointer pr-3">
      <svg
        className={classNames(
          'w-10 h-10 text-neutral-400 transition-transform duration-200',
          props.selectProps.menuIsOpen ? 'rotate-180 text-brand-blue-400' : ''
        )}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </components.DropdownIndicator>
  );
};

const customComponents = {
  ValueContainer: CustomValueContainer,
  DropdownIndicator: CustomDropdownIndicator,
};

const CustomSelect = (props) => {
  const isActuallyDisabled = Boolean(props.isDisabled ?? props.disabled);

  const customStyles = {
    container: (baseStyles) => ({
      ...baseStyles,
      width: '100%',
    }),
    control: (baseStyles, state) => ({
      ...baseStyles,
      fontSize: '1.35rem',
      minHeight: '3.8rem',
      height: '3.8rem',
      backgroundColor: state.isFocused ? 'rgba(20, 22, 34, 0.95)' : 'rgba(12, 13, 20, 0.85)',
      borderColor: state.isFocused
        ? '#3b82f6'
        : isActuallyDisabled
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(255, 255, 255, 0.14)',
      borderRadius: '0.9rem',
      boxShadow: state.isFocused
        ? '0 0 16px rgba(59, 130, 246, 0.35), 0 4px 12px rgba(0, 0, 0, 0.4)'
        : '0 4px 12px rgba(0, 0, 0, 0.35)',
      color: isActuallyDisabled ? '#525252' : '#f1f1f1',
      cursor: isActuallyDisabled ? 'not-allowed' : 'pointer',
      padding: '0 0.2rem 0 0.8rem',
      backdropFilter: 'blur(12px)',
      transition: 'all 0.15s ease',
      '&:hover': {
        borderColor: state.isFocused
          ? '#3b82f6'
          : isActuallyDisabled
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(255, 255, 255, 0.3)',
        boxShadow: '0 0 12px rgba(255, 255, 255, 0.08), 0 4px 14px rgba(0, 0, 0, 0.4)',
      },
    }),
    valueContainer: (base) => ({
      ...base,
      height: '100%',
      overflow: 'hidden',
      padding: '0',
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'nowrap',
    }),
    placeholder: (base) => ({
      ...base,
      position: 'relative',
      top: 'auto',
      transform: 'none',
      color: '#9ca3af',
      fontSize: '1.25rem',
      fontFamily: 'Lato, sans-serif',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      margin: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'inline-flex',
      alignItems: 'center',
      lineHeight: '1',
    }),
    singleValue: (styles) => ({
      ...styles,
      position: 'relative',
      top: 'auto',
      transform: 'none',
      color: '#ffffff',
      fontSize: '1.35rem',
      fontFamily: 'Lato, sans-serif',
      fontWeight: 700,
      letterSpacing: '0.04em',
      margin: 0,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'inline-flex',
      alignItems: 'center',
      lineHeight: '1',
    }),
    input: (styles) => ({
      ...styles,
      color: '#f1f1f1',
      margin: 0,
      padding: 0,
      display: 'inline-flex',
      alignItems: 'center',
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#0c0d14',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '1rem',
      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.85), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
      backdropFilter: 'blur(16px)',
      padding: '0.4rem',
      marginTop: '0.4rem',
      zIndex: 9999,
    }),
    menuList: (base) => ({
      ...base,
      padding: '0.2rem',
      maxHeight: '26rem',
    }),
    option: (provided, state) => ({
      ...provided,
      fontSize: '1.3rem',
      fontWeight: state.isSelected ? 600 : 500,
      fontFamily: 'Lato, sans-serif',
      color: state.isSelected ? '#ffffff' : state.isFocused ? '#ffffff' : '#94a3b8',
      backgroundColor: state.isSelected
        ? 'rgba(59, 130, 246, 0.25)'
        : state.isFocused
        ? 'rgba(255, 255, 255, 0.08)'
        : 'transparent',
      borderRadius: '0.7rem',
      padding: '0.8rem 1.2rem',
      margin: '0.2rem 0',
      cursor: 'pointer',
      transition: 'all 0.12s ease',
      display: 'flex',
      alignItems: 'center',
      borderLeft: state.isSelected ? '3px solid #3b82f6' : '3px solid transparent',
      ':active': {
        backgroundColor: 'rgba(59, 130, 246, 0.35)',
      },
    }),
    indicatorSeparator: () => ({ display: 'none' }),
  };

  return (
    <ReactSelect
      {...props}
      isDisabled={isActuallyDisabled}
      components={customComponents}
      styles={customStyles}
      menuPortalTarget={document.body}
      maxMenuHeight={300}
      menuPosition="fixed"
    />
  );
};

export const ReactSelectComponent = (props) => {
  const { className, ...rest } = props;

  return (
    <div className={classNames(className, 'relative custom-select-wrapper')}>
      <CustomSelect
        {...rest}
        className="custom-select"
      />
    </div>
  );
};
