import classNames from 'classnames';
import React from 'react';
import { NavLink } from 'react-router-dom';

export const Button = ({ as: Component = 'button', className, to, href, onClick, children, buttonStyle, size='md', active, ...rest }) => {
    const sizeStyle = classNames({
        'px-16 py-4': size === 'sm',
        'px-24 py-8': size === 'md',
        'px-24 py-12': size === 'lg',
    });
    const buttonBaseStyle = classNames(className, sizeStyle, "relative flex items-center justify-center overflow-hidden font-bold rounded-[.8rem] transition-all duration-300")
    
    // Unified Glass Style
    const unifiedButtonStyle = classNames(
        buttonBaseStyle, 
        "bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-lg text-white border border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.1)]",
        "hover:from-white/20 hover:to-white/10 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-[1.02]"
    );
    
    // Inactive: Dimmed version of the unified glass style
    const inactiveButtonStyle = classNames(
        buttonBaseStyle, 
        "bg-white/5 backdrop-blur-sm text-neutral-500 border border-white/5 opacity-70 cursor-not-allowed"
    );

    const finalStyle = active !== undefined 
        ? (active ? unifiedButtonStyle : inactiveButtonStyle)
        : unifiedButtonStyle;

    if (to) {
        return (
            <NavLink to={to} className={finalStyle} {...rest}>
                {children}
            </NavLink>
        );
    } else if (href) {
        return (
            <a href={href} className={finalStyle} {...rest}>
                {children}
            </a>
        );
    } else {
        return (
            <Component onClick={onClick} className={finalStyle} {...rest}>
                {children}
            </Component>
        );
    }
};

