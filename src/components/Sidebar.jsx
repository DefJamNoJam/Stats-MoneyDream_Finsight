// Sidebar.jsx
import React from 'react';
import { Drawer, Box, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import EventIcon from '@mui/icons-material/Event';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import HelpIcon from '@mui/icons-material/Help';

const drawerWidth = 240;

function Sidebar() {
  return (
    <Drawer
      variant="permanent"
      anchor="left"
      PaperProps={{
        sx: {
          // 화면 왼쪽에 고정
          position: 'fixed',
          // 헤더(64px) 아래부터 푸터(64px) 위까지
          top: '117px',
          bottom: '64px',
          width: drawerWidth,
          // 스크롤 가능하도록
          overflow: 'auto',
        },
      }}
      sx={{
        // Drawer 자체도 폭 지정
        width: drawerWidth,
        flexShrink: 0,
        zIndex: 0, // 헤더보다 뒤로 배치
      }}
    >
      <Box sx={{ width: drawerWidth }}>
        <List>
          <ListItem button component="a" href="/">
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Home" />
          </ListItem>
          <ListItem button component="a" href="/events">
            <ListItemIcon>
              <EventIcon />
            </ListItemIcon>
            <ListItemText primary="Events" />
          </ListItem>
          <ListItem button component="a" href="/content">
            <ListItemIcon>
              <LightbulbIcon />
            </ListItemIcon>
            <ListItemText primary="Content" />
          </ListItem>
          <ListItem button component="a" href="/help">
            <ListItemIcon>
              <HelpIcon />
            </ListItemIcon>
            <ListItemText primary="Help" />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}

export default Sidebar;
