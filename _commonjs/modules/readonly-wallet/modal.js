"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readonlyWalletModal = void 0;
const feather_js_1 = require("@terra-money/feather.js");
const modal_style_1 = require("./modal.style");
function readonlyWalletModal({ networks, }) {
    return new Promise((resolve) => {
        var _a, _b;
        const styleContainer = document.createElement('style');
        const modalContainer = document.createElement('div');
        function onComplete(session) {
            var _a, _b;
            resolve(session);
            (_a = styleContainer.parentElement) === null || _a === void 0 ? void 0 : _a.removeChild(styleContainer);
            (_b = modalContainer.parentElement) === null || _b === void 0 ? void 0 : _b.removeChild(modalContainer);
        }
        const element = createModalElement({
            networks,
            onComplete,
        });
        styleContainer.textContent = modal_style_1.modalStyle;
        modalContainer.appendChild(element);
        (_a = document.querySelector('head')) === null || _a === void 0 ? void 0 : _a.appendChild(styleContainer);
        (_b = document.querySelector('body')) === null || _b === void 0 ? void 0 : _b.appendChild(modalContainer);
    });
}
exports.readonlyWalletModal = readonlyWalletModal;
function createModalElement({ networks, onComplete, }) {
    var _a;
    // support only pico and phoenix
    let chainID = (_a = Object.keys(networks[0]).find(chainID => chainID.startsWith('pisco-') || chainID.startsWith('phoenix-'))) !== null && _a !== void 0 ? _a : '';
    let address = '';
    // ---------------------------------------------
    // container
    // ---------------------------------------------
    const container = document.createElement('div');
    container.setAttribute('class', 'wallet-readonly-modal');
    // ---------------------------------------------
    // container > div.wallet-readonly-modal--dim
    // ---------------------------------------------
    const dim = document.createElement('div');
    dim.setAttribute('class', 'wallet-readonly-modal--dim');
    container.appendChild(dim);
    // ---------------------------------------------
    // content > div.wallet-readonly-modal--content
    // ---------------------------------------------
    const content = document.createElement('section');
    content.setAttribute('class', 'wallet-readonly-modal--content');
    container.appendChild(content);
    // h1
    const title = document.createElement('h1');
    title.textContent = 'View an Address';
    content.appendChild(title);
    // div
    const selectContainer = document.createElement('div');
    content.appendChild(selectContainer);
    // div > label
    const selectLabel = document.createElement('label');
    selectLabel.textContent = 'Network';
    selectContainer.appendChild(selectLabel);
    // div > .select-wrapper
    const selectWrapper = document.createElement('div');
    selectWrapper.setAttribute('class', 'select-wrapper');
    selectContainer.appendChild(selectWrapper);
    // div > .select-wrapper > select
    const select = document.createElement('select');
    for (const itemNetwork of networks) {
        const option = document.createElement('option');
        option.setAttribute('value', chainID);
        if (itemNetwork[chainID]) {
            option.setAttribute('selected', '');
        }
        option.textContent = `${itemNetwork.chainID}`;
        select.appendChild(option);
    }
    selectWrapper.appendChild(select);
    // div > .select-wrapper > svg
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewbox', '0 0 24 24');
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrow.setAttribute('d', 'M7 10l5 5 5-5z');
    svg.appendChild(arrow);
    selectWrapper.appendChild(svg);
    // div
    const inputContainer = document.createElement('div');
    content.appendChild(inputContainer);
    // div > label
    const inputLabel = document.createElement('label');
    inputLabel.textContent = 'Address';
    inputContainer.appendChild(inputLabel);
    // div > input
    const input = document.createElement('input');
    input.setAttribute('type', 'text');
    inputContainer.appendChild(input);
    // button
    const button = document.createElement('button');
    button.disabled = true;
    button.textContent = 'View an Address';
    content.appendChild(button);
    // ---------------------------------------------
    // bind data
    // ---------------------------------------------
    dim.addEventListener('click', () => {
        onComplete(null);
    });
    /*select.addEventListener('change', (event) => {
      network = (event.target as HTMLSelectElement).value;
    });*/
    input.addEventListener('input', (event) => {
        address = event.target.value;
        button.disabled = !(feather_js_1.AccAddress.validate(address) && button.hasAttribute('disabled'));
    });
    button.addEventListener('click', () => {
        const network = networks.find((itemNetwork) => !!itemNetwork[chainID]);
        if (!network) {
            return;
        }
        onComplete({
            network,
            terraAddress: address,
        });
    });
    return container;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvQHRlcnJhLW1vbmV5L3dhbGxldC1jb250cm9sbGVyL21vZHVsZXMvcmVhZG9ubHktd2FsbGV0L21vZGFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHdEQUFxRDtBQUNyRCwrQ0FBMkM7QUFPM0MsU0FBZ0IsbUJBQW1CLENBQUMsRUFDbEMsUUFBUSxHQUNBO0lBQ1IsT0FBTyxJQUFJLE9BQU8sQ0FBK0IsQ0FBQyxPQUFPLEVBQUUsRUFBRTs7UUFDM0QsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2RCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXJELFNBQVMsVUFBVSxDQUFDLE9BQXFDOztZQUN2RCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDakIsTUFBQSxjQUFjLENBQUMsYUFBYSwwQ0FBRSxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDMUQsTUFBQSxjQUFjLENBQUMsYUFBYSwwQ0FBRSxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDNUQsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLGtCQUFrQixDQUFDO1lBQ2pDLFFBQVE7WUFDUixVQUFVO1NBQ1gsQ0FBQyxDQUFDO1FBRUgsY0FBYyxDQUFDLFdBQVcsR0FBRyx3QkFBVSxDQUFDO1FBQ3hDLGNBQWMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFcEMsTUFBQSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQywwQ0FBRSxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDNUQsTUFBQSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQywwQ0FBRSxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDOUQsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFD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QWlCLENBQUM7SUFFdkMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUU1QixnREFBZ0Q7SUFDaEQsWUFBWTtJQUNaLGdEQUFnRDtJQUNoRCxHQUFHLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNqQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFFSDs7U0FFSztJQUVMLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtRQUN4QyxPQUFPLEdBQUksS0FBSyxDQUFDLE1BQTJCLENBQUMsS0FBSyxDQUFDO1FBRW5ELE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUNqQix1QkFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUNoRSxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNwQyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUMzQixDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FDeEMsQ0FBQztRQUVGLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDWixPQUFPO1NBQ1I7UUFFRCxVQUFVLENBQUM7WUFDVCxPQUFPO1lBQ1AsWUFBWSxFQUFFLE9BQU87U0FDdEIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV0d29ya0luZm8gfSBmcm9tICdAdGVycmEtbW9uZXkvd2FsbGV0LXR5cGVzJztcbmltcG9ydCB7IEFjY0FkZHJlc3MgfSBmcm9tICdAdGVycmEtbW9uZXkvZmVhdGhlci5qcyc7XG5pbXBvcnQgeyBtb2RhbFN0eWxlIH0gZnJvbSAnLi9tb2RhbC5zdHlsZSc7XG5pbXBvcnQgeyBSZWFkb25seVdhbGxldFNlc3Npb24gfSBmcm9tICcuL3R5cGVzJztcblxuaW50ZXJmYWNlIE9wdGlvbnMge1xuICBuZXR3b3JrczogTmV0d29ya0luZm9bXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRvbmx5V2FsbGV0TW9kYWwoe1xuICBuZXR3b3Jrcyxcbn06IE9wdGlvbnMpOiBQcm9taXNlPFJlYWRvbmx5V2FsbGV0U2Vzc2lvbiB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPFJlYWRvbmx5V2FsbGV0U2Vzc2lvbiB8IG51bGw+KChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3Qgc3R5bGVDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIGNvbnN0IG1vZGFsQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICBmdW5jdGlvbiBvbkNvbXBsZXRlKHNlc3Npb246IFJlYWRvbmx5V2FsbGV0U2Vzc2lvbiB8IG51bGwpIHtcbiAgICAgIHJlc29sdmUoc2Vzc2lvbik7XG4gICAgICBzdHlsZUNvbnRhaW5lci5wYXJlbnRFbGVtZW50Py5yZW1vdmVDaGlsZChzdHlsZUNvbnRhaW5lcik7XG4gICAgICBtb2RhbENvbnRhaW5lci5wYXJlbnRFbGVtZW50Py5yZW1vdmVDaGlsZChtb2RhbENvbnRhaW5lcik7XG4gICAgfVxuXG4gICAgY29uc3QgZWxlbWVudCA9IGNyZWF0ZU1vZGFsRWxlbWVudCh7XG4gICAgICBuZXR3b3JrcyxcbiAgICAgIG9uQ29tcGxldGUsXG4gICAgfSk7XG5cbiAgICBzdHlsZUNvbnRhaW5lci50ZXh0Q29udGVudCA9IG1vZGFsU3R5bGU7XG4gICAgbW9kYWxDb250YWluZXIuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XG5cbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdoZWFkJyk/LmFwcGVuZENoaWxkKHN0eWxlQ29udGFpbmVyKTtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdib2R5Jyk/LmFwcGVuZENoaWxkKG1vZGFsQ29udGFpbmVyKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1vZGFsRWxlbWVudCh7XG4gIG5ldHdvcmtzLFxuICBvbkNvbXBsZXRlLFxufTogT3B0aW9ucyAmIHtcbiAgb25Db21wbGV0ZTogKHNlc3Npb246IFJlYWRvbmx5V2FsbGV0U2Vzc2lvbiB8IG51bGwpID0+IHZvaWQ7XG59KTogSFRNTEVsZW1lbnQge1xuICAvLyBzdXBwb3J0IG9ubHkgcGljbyBhbmQgcGhvZW5peFxuICBsZXQgY2hhaW5JRDogc3RyaW5nID0gT2JqZWN0LmtleXMobmV0d29ya3NbMF0pLmZpbmQoY2hhaW5JRCA9PiBjaGFpbklELnN0YXJ0c1dpdGgoJ3Bpc2NvLScpIHx8IGNoYWluSUQuc3RhcnRzV2l0aCgncGhvZW5peC0nKSkgPz8gJyc7XG4gIGxldCBhZGRyZXNzOiBzdHJpbmcgPSAnJztcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gY29udGFpbmVyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgY29udGFpbmVyLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnd2FsbGV0LXJlYWRvbmx5LW1vZGFsJyk7XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIGNvbnRhaW5lciA+IGRpdi53YWxsZXQtcmVhZG9ubHktbW9kYWwtLWRpbVxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY29uc3QgZGltID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGRpbS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ3dhbGxldC1yZWFkb25seS1tb2RhbC0tZGltJyk7XG5cbiAgY29udGFpbmVyLmFwcGVuZENoaWxkKGRpbSk7XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIGNvbnRlbnQgPiBkaXYud2FsbGV0LXJlYWRvbmx5LW1vZGFsLS1jb250ZW50XG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjb25zdCBjb250ZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2VjdGlvbicpO1xuICBjb250ZW50LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnd2FsbGV0LXJlYWRvbmx5LW1vZGFsLS1jb250ZW50Jyk7XG5cbiAgY29udGFpbmVyLmFwcGVuZENoaWxkKGNvbnRlbnQpO1xuXG4gIC8vIGgxXG4gIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDEnKTtcbiAgdGl0bGUudGV4dENvbnRlbnQgPSAnVmlldyBhbiBBZGRyZXNzJztcbiAgY29udGVudC5hcHBlbmRDaGlsZCh0aXRsZSk7XG5cbiAgLy8gZGl2XG4gIGNvbnN0IHNlbGVjdENvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBjb250ZW50LmFwcGVuZENoaWxkKHNlbGVjdENvbnRhaW5lcik7XG5cbiAgLy8gZGl2ID4gbGFiZWxcbiAgY29uc3Qgc2VsZWN0TGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xuICBzZWxlY3RMYWJlbC50ZXh0Q29udGVudCA9ICdOZXR3b3JrJztcbiAgc2VsZWN0Q29udGFpbmVyLmFwcGVuZENoaWxkKHNlbGVjdExhYmVsKTtcblxuICAvLyBkaXYgPiAuc2VsZWN0LXdyYXBwZXJcbiAgY29uc3Qgc2VsZWN0V3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBzZWxlY3RXcmFwcGVyLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnc2VsZWN0LXdyYXBwZXInKTtcbiAgc2VsZWN0Q29udGFpbmVyLmFwcGVuZENoaWxkKHNlbGVjdFdyYXBwZXIpO1xuXG4gIC8vIGRpdiA+IC5zZWxlY3Qtd3JhcHBlciA+IHNlbGVjdFxuICBjb25zdCBzZWxlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzZWxlY3QnKTtcblxuICBmb3IgKGNvbnN0IGl0ZW1OZXR3b3JrIG9mIG5ldHdvcmtzKSB7XG4gICAgY29uc3Qgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnb3B0aW9uJyk7XG4gICAgb3B0aW9uLnNldEF0dHJpYnV0ZSgndmFsdWUnLCBjaGFpbklEKTtcblxuICAgIGlmIChpdGVtTmV0d29ya1tjaGFpbklEXSkge1xuICAgICAgb3B0aW9uLnNldEF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCAnJyk7XG4gICAgfVxuXG4gICAgb3B0aW9uLnRleHRDb250ZW50ID0gYCR7aXRlbU5ldHdvcmsuY2hhaW5JRH1gO1xuXG4gICAgc2VsZWN0LmFwcGVuZENoaWxkKG9wdGlvbik7XG4gIH1cblxuICBzZWxlY3RXcmFwcGVyLmFwcGVuZENoaWxkKHNlbGVjdCk7XG5cbiAgLy8gZGl2ID4gLnNlbGVjdC13cmFwcGVyID4gc3ZnXG4gIGNvbnN0IHN2ZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAnc3ZnJyk7XG4gIHN2Zy5zZXRBdHRyaWJ1dGUoJ3ZpZXdib3gnLCAnMCAwIDI0IDI0Jyk7XG5cbiAgY29uc3QgYXJyb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3BhdGgnKTtcbiAgYXJyb3cuc2V0QXR0cmlidXRlKCdkJywgJ003IDEwbDUgNSA1LTV6Jyk7XG4gIHN2Zy5hcHBlbmRDaGlsZChhcnJvdyk7XG5cbiAgc2VsZWN0V3JhcHBlci5hcHBlbmRDaGlsZChzdmcpO1xuXG4gIC8vIGRpdlxuICBjb25zdCBpbnB1dENvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBjb250ZW50LmFwcGVuZENoaWxkKGlucHV0Q29udGFpbmVyKTtcblxuICAvLyBkaXYgPiBsYWJlbFxuICBjb25zdCBpbnB1dExhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcbiAgaW5wdXRMYWJlbC50ZXh0Q29udGVudCA9ICdBZGRyZXNzJztcblxuICBpbnB1dENvbnRhaW5lci5hcHBlbmRDaGlsZChpbnB1dExhYmVsKTtcblxuICAvLyBkaXYgPiBpbnB1dFxuICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gIGlucHV0LnNldEF0dHJpYnV0ZSgndHlwZScsICd0ZXh0Jyk7XG5cbiAgaW5wdXRDb250YWluZXIuYXBwZW5kQ2hpbGQoaW5wdXQpO1xuXG4gIC8vIGJ1dHRvblxuICBjb25zdCBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgYnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgYnV0dG9uLnRleHRDb250ZW50ID0gJ1ZpZXcgYW4gQWRkcmVzcyc7XG5cbiAgY29udGVudC5hcHBlbmRDaGlsZChidXR0b24pO1xuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBiaW5kIGRhdGFcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRpbS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBvbkNvbXBsZXRlKG51bGwpO1xuICB9KTtcblxuICAvKnNlbGVjdC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZXZlbnQpID0+IHtcbiAgICBuZXR3b3JrID0gKGV2ZW50LnRhcmdldCBhcyBIVE1MU2VsZWN0RWxlbWVudCkudmFsdWU7XG4gIH0pOyovXG5cbiAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoZXZlbnQpID0+IHtcbiAgICBhZGRyZXNzID0gKGV2ZW50LnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcblxuICAgIGJ1dHRvbi5kaXNhYmxlZCA9ICEoXG4gICAgICBBY2NBZGRyZXNzLnZhbGlkYXRlKGFkZHJlc3MpICYmIGJ1dHRvbi5oYXNBdHRyaWJ1dGUoJ2Rpc2FibGVkJylcbiAgICApO1xuICB9KTtcblxuICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgY29uc3QgbmV0d29yayA9IG5ldHdvcmtzLmZpbmQoXG4gICAgICAoaXRlbU5ldHdvcmspID0+ICEhaXRlbU5ldHdvcmtbY2hhaW5JRF0sXG4gICAgKTtcblxuICAgIGlmICghbmV0d29yaykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG9uQ29tcGxldGUoe1xuICAgICAgbmV0d29yayxcbiAgICAgIHRlcnJhQWRkcmVzczogYWRkcmVzcyxcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIGNvbnRhaW5lcjtcbn1cbiJdfQ==