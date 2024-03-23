import { Box } from "@mui/material"
import { LayoutProps } from "@/types"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"

export const Layout: React.FC<LayoutProps> = ({ children }) => {
	return (
        <Box sx={{
            background: 'background.default',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            height: 'fit-content',
            color: 'text.primary',
            backgroundColor: theme => theme.palette.background.default
        }}>
            <Header />
            <Box sx={{
                display: 'flex',
                alignSelf: 'center',
                minHeight: { xs: '84vh', md: '80vh' },
                width: { xs: '100%', md: '80%' },
                justifyContent: 'center',
                flexDirection: 'column',
                padding: '3rem 2rem'
            }}>
                {children}
            </Box>
            <Footer />
        </Box>
	)
}

export default Layout
