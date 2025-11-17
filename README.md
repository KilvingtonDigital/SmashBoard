# SmashBoard

**Court-aware DUPR scheduling for pickleball tournaments and sessions**

SmashBoard is a comprehensive tournament management app for pickleball that supports both Round Robin and King of Court formats. Available as a web app and native mobile apps for iOS and Android.

## Features

- **Tournament Management**: Create and manage pickleball tournaments with ease
- **Multiple Formats**: Support for Round Robin and King of Court tournaments
- **DUPR Integration**: Track and use DUPR ratings for fair matchmaking
- **Real-time Scoring**: Live score updates and match tracking
- **Player Roster**: Manage players with presence tracking and skill levels
- **Court Management**: Multi-court support with skill-based assignments
- **Statistics**: Comprehensive stats tracking and export
- **Mobile Apps**: Native iOS and Android apps with camera and file upload support
- **PWA Support**: Install on any device as a Progressive Web App
- **Data Export**: Export results as CSV or JSON

## Quick Start

### Web Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

### Mobile App Development

SmashBoard supports native iOS and Android apps! See [MOBILE.md](./MOBILE.md) for detailed instructions.

**Quick mobile commands:**

```bash
# Build and sync to mobile platforms
npm run mobile:build

# Open iOS in Xcode (Mac only)
npm run mobile:ios

# Open Android in Android Studio
npm run mobile:android
```

## Project Structure

```
SmashBoard/
├── src/
│   ├── PickleballTournamentManager.js  # Main app component
│   ├── InstallPrompt.js                # PWA install prompt
│   ├── mobileHelpers.js                # Native mobile utilities
│   ├── App.js                          # App wrapper
│   └── index.css                       # Global styles
├── public/                             # Static assets
├── build/                              # Production build (for GitHub Pages)
├── ios/                                # iOS native project (gitignored)
├── android/                            # Android native project (gitignored)
├── capacitor.config.ts                 # Capacitor configuration
├── MOBILE.md                           # Mobile development guide
└── package.json
```

## Native Mobile Features

The mobile apps include access to native device capabilities:

- **Camera**: Take photos or select from gallery
- **File System**: Save and load tournament data
- **Share**: Share results via native share dialog
- **Splash Screen**: Branded app launch experience
- **App Lifecycle**: Handle app state changes

See [mobileHelpers.js](./src/mobileHelpers.js) for usage examples.

## Technology Stack

- **Frontend**: React 19.1.1
- **Styling**: Tailwind CSS 3.4
- **Build Tool**: Create React App
- **Mobile**: Capacitor 7.4
- **Deployment**: GitHub Pages
- **State Management**: React Hooks (useState, useEffect)
- **Data Persistence**: LocalStorage (web), Native FileSystem (mobile)

## Available Scripts

### Web Scripts
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run deploy` - Deploy to GitHub Pages
- `npm test` - Run tests

### Mobile Scripts
- `npm run mobile:build` - Build web app and sync to mobile platforms
- `npm run mobile:ios` - Open iOS project in Xcode
- `npm run mobile:android` - Open Android project in Android Studio
- `npm run mobile:sync` - Sync web assets to native projects
- `npm run mobile:add-ios` - Regenerate iOS platform
- `npm run mobile:add-android` - Regenerate Android platform

## Development Workflow

1. **Make changes** to React code in `src/`
2. **Test in browser**: `npm start`
3. **Test on mobile**: `npm run mobile:build` then open in IDE
4. **Commit changes** to git
5. **Deploy web version**: `npm run deploy`

## Deployment

### Web (GitHub Pages)
```bash
npm run deploy
```

The app will be deployed to: `https://[your-username].github.io/SmashBoard`

### Mobile (App Stores)

See [MOBILE.md](./MOBILE.md) for complete instructions on:
- Building signed iOS apps for the App Store
- Building signed Android APKs/Bundles for Google Play
- App store submission process

## Roadmap

### Short-term Goals
- [ ] User authentication and accounts
- [ ] Cloud data synchronization
- [ ] Online tournament registration

### Long-term Goals
- [ ] Player registration portal
- [ ] Payment processing integration (Stripe)
- [ ] DUPR API integration
- [ ] Email notifications
- [ ] Tournament templates
- [ ] Advanced analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on web and mobile
5. Submit a pull request

## License

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [React Documentation](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [DUPR Rating System](https://mydupr.com/)

## Support

For issues or questions:
- Create an issue in this repository
- Check [MOBILE.md](./MOBILE.md) for mobile-specific help
- Review the [Capacitor docs](https://capacitorjs.com/docs) for plugin usage
