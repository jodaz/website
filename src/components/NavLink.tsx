import * as React from 'react'
import { Link } from "@mui/material";
import NextLink from 'next/link';

interface INavLink {
    route: string;
    i: number;
    name: string;
}

const NavLink = ({
    route,
    i,
    name
} : INavLink) => {
    const [initialRender, setInitialRender] = React.useState(false)

    React.useEffect(() => {
        setInitialRender(true)
    }, [])

    if (!initialRender) return <></>

	return (
        <Link
            component={NextLink}
            href={route}
            key={i}
            sx={{
                textDecoration: 'none',
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: '1px',
                fontSize: '0.9rem'
            }}
        >
            {name}
        </Link>
	)
}

export default NavLink
