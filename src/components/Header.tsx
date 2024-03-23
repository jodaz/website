import * as React from 'react'
import { Box, IconButton, Stack, useMediaQuery } from "@mui/material";
import { Close, Menu } from "@/constants/icons";
import { INTERNAL_LINKS } from '@/constants/internal-links';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import NavLink from './NavLink';
import ToggleLanguageButton from "./ToggleLanguageButton";
import ToggleThemeButton from "./ToggleThemeButton";
import Image from "next/image";
import NextLink from 'next/link';

const DesktopMenu = ({ i18n }) => {
    const router = useRouter();

    const isHomePage = router.pathname === '/';

    const renderLinks = () => INTERNAL_LINKS.map((link, i) => (
        <NavLink route={link.route} i={i} name={i18n(link.page)} />
    ))

    return (
        <Stack
            spacing={2}
            direction='row'
            sx={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'end'
            }}
        >
            {!isHomePage ? renderLinks() : null}
            <ToggleLanguageButton />
            <ToggleThemeButton />
        </Stack>
    )
}

const MobileMenu = ({ i18n }) => {
    const [isOpen, setIsOpen] = React.useState(false)

    const toggleMenu = () => setIsOpen(!isOpen)

    return (
        <>
            {!isOpen ? (
                <IconButton onClick={toggleMenu}>
                    <Menu />
                </IconButton>
            ) : null}
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                height: '100vh',
                width: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: isOpen ? 'flex' : 'none',
                zIndex: '100',
                alignItems: 'end',
                flexDirection: 'column',
                overflowY: 'hidden'
            }}>
                <Box sx={{
                    display: 'flex',
                    backgroundColor: '#fff',
                    height: '100%',
                    width: '80%',
                    flexDirection: 'column'
                }}>
                    <Stack
                        spacing={1}
                        direction='column'
                        sx={{
                            flex: 1,
                            backgroundColor: '#fff',
                            width: '80%'
                        }}
                    >
                        <IconButton onClick={toggleMenu}>
                            <Close />
                        </IconButton>
                        {INTERNAL_LINKS.map((link, i) => (
                            <NavLink route={link.route} i={i} name={i18n(link.page)} />
                        ))}
                        <ToggleThemeButton />
                    </Stack>
                    <ToggleLanguageButton />
                </Box>
            </Box>
        </>
    )
}

export function Header() {
    const isSmall = useMediaQuery('(max-width:600px)')
    const { t } = useTranslation()

    return (
        <>
            <Box sx={{
                maxHeight: '100px',
                display: 'flex',
                justifyContent: 'center',
                zIndex: 1,
                position: 'relative'
            }}>
                <Box display='flex' justifyContent='space-between' alignSelf='center' sx={{
                    width: { xs: '100%', md: '50%' }
                }}>
                    <Box mt={2} ml={3} alignSelf='center'>
                        <NextLink href='/'>
                            <Image
                                src={'/android-chrome-512x512.png'}
                                alt="Logo"
                                width='30'
                                height='30'
                            />
                        </NextLink>
                    </Box>
                </Box>
                {isSmall ? <MobileMenu i18n={t} /> : <DesktopMenu i18n={t} />}
            </Box>
        </>
    )
}
