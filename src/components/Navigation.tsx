import * as React from 'react'
import { Stack } from "@mui/material";
import { INTERNAL_LINKS } from '@/constants/internal-links';
import { useTranslation } from 'react-i18next';
import NavLink from './NavLink';

const Navigation = () => {
    const [initialRender, setInitialRender] = React.useState(false)
    const { t } = useTranslation()

    React.useEffect(() => {
        setInitialRender(true)
    }, [])

    if (!initialRender) return <></>

	return (
        <Stack spacing={2} direction='row'>
            {INTERNAL_LINKS.map((link, i) => (
                <NavLink route={link.route} i={i} name={t(link.page)} />
            ))}
        </Stack>
	)
}

export default Navigation
