import * as React from 'react'
import Image from 'next/image'
import {
	Box,
    AvatarProps
} from '@mui/material'

interface IAvatar extends AvatarProps {
   height?: number;
   width?: number;
   style?: any
}

export const Avatar: React.FC<IAvatar> = ({ sx, height, width, style, ...rest }) => {
	return (
		<Box sx={{
			width: 'fit-content',
			height: 'fit-content',
			boxSizing: 'content-box',
            ...sx
		}} {...rest}>
			<Image
				src="/images/avatar.jpeg"
				alt="avatar"
				width={width}
				height={height}
				blurDataURL='/images/blurred-image.jpg'
				placeholder="blur"
                style={style}
			/>
		</Box>
	)
}

Avatar.defaultProps = {
    height: 200,
    width: 200
}
