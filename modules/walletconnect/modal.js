import { toCanvas } from 'qrcode';
import { isMobile as isMobileBrowser } from '../../utils/browser-check';
import { modalStyle } from './modal.style';
export class TerraWalletconnectQrcodeModal {
    constructor() {
        this.modalContainer = null;
        this.styleContainer = null;
        this.callback = null;
        this.setCloseCallback = (callback) => {
            this.callback = callback;
        };
        this.open = (uri, cb, _qrcodeModalOptions) => {
            var _a, _b;
            const modalContainer = document.createElement('div');
            const stylecontainer = document.createElement('style');
            const query = encodeURIComponent(`action=wallet_connect&payload=${encodeURIComponent(uri)}`);
            const schemeUri = `https://terrastation.page.link/?link=https://terra.money?${query}&apn=money.terra.station&ibi=money.terra.station&isi=1548434735`;
            const element = createModalElement({
                schemeUri,
                onClose: () => {
                    if (this.callback) {
                        this.callback();
                        this.callback = null;
                    }
                    this.close();
                },
            });
            if (isMobileBrowser()) {
                window.location.href = schemeUri;
            }
            stylecontainer.textContent = modalStyle;
            modalContainer.appendChild(element);
            (_a = document.querySelector('head')) === null || _a === void 0 ? void 0 : _a.appendChild(stylecontainer);
            (_b = document.querySelector('body')) === null || _b === void 0 ? void 0 : _b.appendChild(modalContainer);
            this.modalContainer = modalContainer;
            this.styleContainer = stylecontainer;
        };
        this.close = () => {
            var _a, _b;
            if (this.modalContainer) {
                (_a = this.modalContainer.parentElement) === null || _a === void 0 ? void 0 : _a.removeChild(this.modalContainer);
            }
            if (this.styleContainer) {
                (_b = this.styleContainer.parentElement) === null || _b === void 0 ? void 0 : _b.removeChild(this.styleContainer);
            }
            this.callback = null;
        };
    }
}
function createModalElement({ schemeUri, onClose, }) {
    const isMobile = isMobileBrowser();
    const openTerraStationMobile = () => {
        window.location.href = schemeUri;
    };
    // ---------------------------------------------
    // container
    // ---------------------------------------------
    const container = document.createElement('div');
    container.setAttribute('class', 'wallet-wc-modal');
    // ---------------------------------------------
    // container > div.wallet-wc-modal--dim
    // ---------------------------------------------
    const dim = document.createElement('div');
    dim.setAttribute('class', 'wallet-wc-modal--dim');
    container.appendChild(dim);
    // ---------------------------------------------
    // container > div.wallet-wc-modal--content
    // ---------------------------------------------
    const content = document.createElement('section');
    content.setAttribute('class', 'wallet-wc-modal--content');
    content.setAttribute('data-device', isMobile ? 'mobile' : 'desktop');
    container.appendChild(content);
    // h1
    const title = document.createElement('h1');
    content.appendChild(title);
    const img = document.createElement('img');
    img.setAttribute('src', 'https://assets.terra.dev/icon/wallet-provider/walletconnect.svg');
    img.setAttribute('style', 'width: 1em; margin-right: 10px; transform: scale(1.5) translateY(0.08em)');
    const span = document.createElement('span');
    span.textContent = 'Wallet Connect';
    title.appendChild(img);
    title.appendChild(span);
    // p
    const description = document.createElement('p');
    description.textContent =
        'Scan QR code with a WalletConnect-compatible wallet';
    content.appendChild(description);
    if (isMobile) {
        // button
        const button = document.createElement('button');
        button.addEventListener('click', openTerraStationMobile);
        button.textContent = 'Open Terra Station Mobile';
        content.appendChild(button);
    }
    else {
        // qrcode
        const canvas = document.createElement('canvas');
        toCanvas(canvas, schemeUri, {
            width: 220,
            margin: 0,
            color: {
                dark: '#2043b5ff',
            },
        });
        content.appendChild(canvas);
    }
    // events
    dim.addEventListener('click', onClose);
    return container;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvQHRlcnJhLW1vbmV5L3dhbGxldC1jb250cm9sbGVyL21vZHVsZXMvd2FsbGV0Y29ubmVjdC9tb2RhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxRQUFRLElBQUksZUFBZSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUUzQyxNQUFNLE9BQU8sNkJBQTZCO0lBQTFDO1FBQ0UsbUJBQWMsR0FBMEIsSUFBSSxDQUFDO1FBQzdDLG1CQUFjLEdBQTRCLElBQUksQ0FBQztRQUV2QyxhQUFRLEdBQXdCLElBQUksQ0FBQztRQUU3QyxxQkFBZ0IsR0FBRyxDQUFDLFFBQW9CLEVBQUUsRUFBRTtZQUMxQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUMzQixDQUFDLENBQUM7UUFFRixTQUFJLEdBQUcsQ0FDTCxHQUFXLEVBQ1gsRUFBYyxFQUNkLG1CQUF5QyxFQUN6QyxFQUFFOztZQUNGLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUV2RCxNQUFNLEtBQUssR0FBRyxrQkFBa0IsQ0FDOUIsaUNBQWlDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQzNELENBQUM7WUFFRixNQUFNLFNBQVMsR0FBRyw0REFBNEQsS0FBSyxpRUFBaUUsQ0FBQztZQUVySixNQUFNLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQztnQkFDakMsU0FBUztnQkFDVCxPQUFPLEVBQUUsR0FBRyxFQUFFO29CQUNaLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTt3QkFD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QVM7SUFDVCxHQUFHLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRXZDLE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJUVJDb2RlTW9kYWwsIElRUkNvZGVNb2RhbE9wdGlvbnMgfSBmcm9tICdAd2FsbGV0Y29ubmVjdC90eXBlcyc7XG5pbXBvcnQgeyB0b0NhbnZhcyB9IGZyb20gJ3FyY29kZSc7XG5pbXBvcnQgeyBpc01vYmlsZSBhcyBpc01vYmlsZUJyb3dzZXIgfSBmcm9tICcuLi8uLi91dGlscy9icm93c2VyLWNoZWNrJztcbmltcG9ydCB7IG1vZGFsU3R5bGUgfSBmcm9tICcuL21vZGFsLnN0eWxlJztcblxuZXhwb3J0IGNsYXNzIFRlcnJhV2FsbGV0Y29ubmVjdFFyY29kZU1vZGFsIGltcGxlbWVudHMgSVFSQ29kZU1vZGFsIHtcbiAgbW9kYWxDb250YWluZXI6IEhUTUxEaXZFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHN0eWxlQ29udGFpbmVyOiBIVE1MU3R5bGVFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBjYWxsYmFjazogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cbiAgc2V0Q2xvc2VDYWxsYmFjayA9IChjYWxsYmFjazogKCkgPT4gdm9pZCkgPT4ge1xuICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgfTtcblxuICBvcGVuID0gKFxuICAgIHVyaTogc3RyaW5nLFxuICAgIGNiOiAoKSA9PiB2b2lkLFxuICAgIF9xcmNvZGVNb2RhbE9wdGlvbnM/OiBJUVJDb2RlTW9kYWxPcHRpb25zLFxuICApID0+IHtcbiAgICBjb25zdCBtb2RhbENvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGNvbnN0IHN0eWxlY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gZW5jb2RlVVJJQ29tcG9uZW50KFxuICAgICAgYGFjdGlvbj13YWxsZXRfY29ubmVjdCZwYXlsb2FkPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHVyaSl9YCxcbiAgICApO1xuXG4gICAgY29uc3Qgc2NoZW1lVXJpID0gYGh0dHBzOi8vdGVycmFzdGF0aW9uLnBhZ2UubGluay8/bGluaz1odHRwczovL3RlcnJhLm1vbmV5PyR7cXVlcnl9JmFwbj1tb25leS50ZXJyYS5zdGF0aW9uJmliaT1tb25leS50ZXJyYS5zdGF0aW9uJmlzaT0xNTQ4NDM0NzM1YDtcblxuICAgIGNvbnN0IGVsZW1lbnQgPSBjcmVhdGVNb2RhbEVsZW1lbnQoe1xuICAgICAgc2NoZW1lVXJpLFxuICAgICAgb25DbG9zZTogKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5jYWxsYmFjaykge1xuICAgICAgICAgIHRoaXMuY2FsbGJhY2soKTtcbiAgICAgICAgICB0aGlzLmNhbGxiYWNrID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGlzTW9iaWxlQnJvd3NlcigpKSB7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHNjaGVtZVVyaTtcbiAgICB9XG5cbiAgICBzdHlsZWNvbnRhaW5lci50ZXh0Q29udGVudCA9IG1vZGFsU3R5bGU7XG4gICAgbW9kYWxDb250YWluZXIuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XG5cbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdoZWFkJyk/LmFwcGVuZENoaWxkKHN0eWxlY29udGFpbmVyKTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5Jyk/LmFwcGVuZENoaWxkKG1vZGFsQ29udGFpbmVyKTtcblxuICAgIHRoaXMubW9kYWxDb250YWluZXIgPSBtb2RhbENvbnRhaW5lcjtcbiAgICB0aGlzLnN0eWxlQ29udGFpbmVyID0gc3R5bGVjb250YWluZXI7XG4gIH07XG5cbiAgY2xvc2UgPSAoKSA9PiB7XG4gICAgaWYgKHRoaXMubW9kYWxDb250YWluZXIpIHtcbiAgICAgIHRoaXMubW9kYWxDb250YWluZXIucGFyZW50RWxlbWVudD8ucmVtb3ZlQ2hpbGQodGhpcy5tb2RhbENvbnRhaW5lcik7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3R5bGVDb250YWluZXIpIHtcbiAgICAgIHRoaXMuc3R5bGVDb250YWluZXIucGFyZW50RWxlbWVudD8ucmVtb3ZlQ2hpbGQodGhpcy5zdHlsZUNvbnRhaW5lcik7XG4gICAgfVxuXG4gICAgdGhpcy5jYWxsYmFjayA9IG51bGw7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1vZGFsRWxlbWVudCh7XG4gIHNjaGVtZVVyaSxcbiAgb25DbG9zZSxcbn06IHtcbiAgc2NoZW1lVXJpOiBzdHJpbmc7XG4gIG9uQ2xvc2U6ICgpID0+IHZvaWQ7XG59KTogSFRNTEVsZW1lbnQge1xuICBjb25zdCBpc01vYmlsZSA9IGlzTW9iaWxlQnJvd3NlcigpO1xuXG4gIGNvbnN0IG9wZW5UZXJyYVN0YXRpb25Nb2JpbGUgPSAoKSA9PiB7XG4gICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBzY2hlbWVVcmk7XG4gIH07XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIGNvbnRhaW5lclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGNvbnRhaW5lci5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3dhbGxldC13Yy1tb2RhbCcpO1xuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBjb250YWluZXIgPiBkaXYud2FsbGV0LXdjLW1vZGFsLS1kaW1cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNvbnN0IGRpbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBkaW0uc2V0QXR0cmlidXRlKCdjbGFzcycsICd3YWxsZXQtd2MtbW9kYWwtLWRpbScpO1xuXG4gIGNvbnRhaW5lci5hcHBlbmRDaGlsZChkaW0pO1xuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBjb250YWluZXIgPiBkaXYud2FsbGV0LXdjLW1vZGFsLS1jb250ZW50XG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjb25zdCBjb250ZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2VjdGlvbicpO1xuICBjb250ZW50LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnd2FsbGV0LXdjLW1vZGFsLS1jb250ZW50Jyk7XG4gIGNvbnRlbnQuc2V0QXR0cmlidXRlKCdkYXRhLWRldmljZScsIGlzTW9iaWxlID8gJ21vYmlsZScgOiAnZGVza3RvcCcpO1xuXG4gIGNvbnRhaW5lci5hcHBlbmRDaGlsZChjb250ZW50KTtcblxuICAvLyBoMVxuICBjb25zdCB0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2gxJyk7XG4gIGNvbnRlbnQuYXBwZW5kQ2hpbGQodGl0bGUpO1xuXG4gIGNvbnN0IGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICBpbWcuc2V0QXR0cmlidXRlKFxuICAgICdzcmMnLFxuICAgICdodHRwczovL2Fzc2V0cy50ZXJyYS5kZXYvaWNvbi93YWxsZXQtcHJvdmlkZXIvd2FsbGV0Y29ubmVjdC5zdmcnLFxuICApO1xuICBpbWcuc2V0QXR0cmlidXRlKFxuICAgICdzdHlsZScsXG4gICAgJ3dpZHRoOiAxZW07IG1hcmdpbi1yaWdodDogMTBweDsgdHJhbnNmb3JtOiBzY2FsZSgxLjUpIHRyYW5zbGF0ZVkoMC4wOGVtKScsXG4gICk7XG5cbiAgY29uc3Qgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgc3Bhbi50ZXh0Q29udGVudCA9ICdXYWxsZXQgQ29ubmVjdCc7XG5cbiAgdGl0bGUuYXBwZW5kQ2hpbGQoaW1nKTtcbiAgdGl0bGUuYXBwZW5kQ2hpbGQoc3Bhbik7XG5cbiAgLy8gcFxuICBjb25zdCBkZXNjcmlwdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgZGVzY3JpcHRpb24udGV4dENvbnRlbnQgPVxuICAgICdTY2FuIFFSIGNvZGUgd2l0aCBhIFdhbGxldENvbm5lY3QtY29tcGF0aWJsZSB3YWxsZXQnO1xuICBjb250ZW50LmFwcGVuZENoaWxkKGRlc2NyaXB0aW9uKTtcblxuICBpZiAoaXNNb2JpbGUpIHtcbiAgICAvLyBidXR0b25cbiAgICBjb25zdCBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBvcGVuVGVycmFTdGF0aW9uTW9iaWxlKTtcbiAgICBidXR0b24udGV4dENvbnRlbnQgPSAnT3BlbiBUZXJyYSBTdGF0aW9uIE1vYmlsZSc7XG5cbiAgICBjb250ZW50LmFwcGVuZENoaWxkKGJ1dHRvbik7XG4gIH0gZWxzZSB7XG4gICAgLy8gcXJjb2RlXG4gICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdG9DYW52YXMoY2FudmFzLCBzY2hlbWVVcmksIHtcbiAgICAgIHdpZHRoOiAyMjAsXG4gICAgICBtYXJnaW46IDAsXG4gICAgICBjb2xvcjoge1xuICAgICAgICBkYXJrOiAnIzIwNDNiNWZmJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb250ZW50LmFwcGVuZENoaWxkKGNhbnZhcyk7XG4gIH1cblxuICAvLyBldmVudHNcbiAgZGltLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgb25DbG9zZSk7XG5cbiAgcmV0dXJuIGNvbnRhaW5lcjtcbn1cbiJdfQ==